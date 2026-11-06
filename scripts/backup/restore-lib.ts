/**
 * Comparing a backup with a live database, and writing it back safely.
 *
 * The rules, in order of importance:
 *
 *   1. NEVER delete. Restore only adds or (when asked) overwrites rows.
 *   2. By default, only rows that are MISSING from the live database are
 *      inserted. A record deleted by mistake comes back; a record edited since
 *      the backup keeps its newer edit. This is the same union-merge principle
 *      the app's sync uses, and it is what makes "restore the last backup"
 *      safe to run on a database that is still mostly fine.
 *   3. Overwriting rows that differ is a separate, explicit step.
 *   4. Columns the backup deliberately left out (credentials) are never
 *      compared and never written, so a restore cannot blank them out.
 */
import type { Row, Snapshot } from './snapshot.ts';

export interface RestoreDb {
  /** Every row in the table, complete (it must verify its own paging). */
  readAll(table: string, primaryKey: string[]): Promise<Row[]>;
  /** Insert rows whose primary key is not present; leave existing rows untouched. */
  insertMissing(table: string, primaryKey: string[], rows: Row[]): Promise<void>;
  /** Insert rows, replacing any existing row with the same primary key. */
  upsert(table: string, primaryKey: string[], rows: Row[]): Promise<void>;
}

export interface TableDiff {
  table: string;
  primaryKey: string[];
  inBackup: number;
  /** In the backup but not in the live database. */
  missing: Row[];
  /** In both, but with different values in at least one backed-up column. */
  changed: Row[];
  unchanged: number;
  /** In the live database but not in the backup (kept; restore never deletes). */
  liveOnly: number;
}

const pkKey = (row: Row, pk: string[]): string => JSON.stringify(pk.map((c) => row[c]));

/** Order-independent form of a value, so {a:1,b:2} equals {b:2,a:1}. */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, canon(val)]),
    );
  }
  return v;
}

/** True if every column the BACKUP has holds the same value in the live row. */
function sameValues(backupRow: Row, liveRow: Row): boolean {
  for (const [col, val] of Object.entries(backupRow)) {
    if (JSON.stringify(canon(val)) !== JSON.stringify(canon(liveRow[col]))) return false;
  }
  return true;
}

export async function diffSnapshot(snapshot: Snapshot, live: RestoreDb, only?: string[]): Promise<TableDiff[]> {
  const diffs: TableDiff[] = [];
  for (const [table, t] of Object.entries(snapshot.tables)) {
    if (only && !only.includes(table)) continue;
    const liveRows = await live.readAll(table, t.primaryKey);
    const liveByKey = new Map(liveRows.map((r) => [pkKey(r, t.primaryKey), r]));
    const backupKeys = new Set<string>();

    const missing: Row[] = [];
    const changed: Row[] = [];
    let unchanged = 0;
    for (const row of t.rows) {
      const key = pkKey(row, t.primaryKey);
      backupKeys.add(key);
      const existing = liveByKey.get(key);
      if (!existing) missing.push(row);
      else if (sameValues(row, existing)) unchanged++;
      else changed.push(row);
    }
    let liveOnly = 0;
    for (const key of liveByKey.keys()) if (!backupKeys.has(key)) liveOnly++;

    diffs.push({ table, primaryKey: t.primaryKey, inBackup: t.rows.length, missing, changed, unchanged, liveOnly });
  }
  return diffs;
}

export interface ApplyReport {
  table: string;
  inserted: number;
  overwritten: number;
}

const CHUNK = 200;

/** Writes the diff back. Inserts missing rows; overwrites changed rows only if `overwrite` is set. */
export async function applyDiff(
  diffs: TableDiff[],
  live: RestoreDb,
  opts: { overwrite: boolean },
): Promise<ApplyReport[]> {
  const reports: ApplyReport[] = [];
  for (const d of diffs) {
    for (let i = 0; i < d.missing.length; i += CHUNK) {
      await live.insertMissing(d.table, d.primaryKey, d.missing.slice(i, i + CHUNK));
    }
    let overwritten = 0;
    if (opts.overwrite) {
      for (let i = 0; i < d.changed.length; i += CHUNK) {
        await live.upsert(d.table, d.primaryKey, d.changed.slice(i, i + CHUNK));
      }
      overwritten = d.changed.length;
    }
    reports.push({ table: d.table, inserted: d.missing.length, overwritten });
  }
  return reports;
}
