/**
 * Builds, and later verifies, the plaintext snapshot that gets encrypted.
 *
 * The export is only worth anything if it is COMPLETE, so most of this file is
 * about proving completeness rather than about reading rows:
 *
 *   - Coverage: every table in the database is either backed up or explicitly
 *     excluded. An unclassified table aborts the run.
 *   - Count: each table is compared with an exact row count taken before AND
 *     after reading it. Responses that PostgREST truncated silently, or a table
 *     that changed mid-read, fail the run instead of producing a short backup
 *     that looks fine.
 *   - Secrets: credential-shaped values abort the run (see secret-scan.ts).
 *   - Hashes: every table carries a SHA-256 of its rows, checked again at
 *     restore, so a backup can be shown intact without trusting anything else.
 */
import { createHash } from 'node:crypto';
import {
  EXCLUDE,
  INCLUDE,
  MAX_CONSISTENCY_ATTEMPTS,
  PAGE_SIZE,
  SNAPSHOT_FORMAT,
  SNAPSHOT_VERSION,
  type TablePolicy,
} from './config.ts';
import { assertNoSecrets } from './secret-scan.ts';

export type Row = Record<string, unknown>;

/** Auth user fields that are safe to keep. Never includes passwords, hashes or tokens. */
export interface AuthUserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  providers: string[];
}

/** The only things the export needs from the database. Easy to stub in tests. */
export interface Db {
  /** Names of every table (and view) PostgREST exposes. */
  listTables(): Promise<string[]>;
  /** Exact row count. */
  count(table: string): Promise<number>;
  /** Rows `from`..`to` inclusive, ordered by `orderBy`. May return fewer than asked. */
  page(table: string, from: number, to: number, orderBy: string[]): Promise<Row[]>;
  listAuthUsers(): Promise<{ users: AuthUserRecord[]; total: number | null }>;
  /**
   * SQL that recreates the public schema (tables, indexes, RLS, policies,
   * functions), or null if the database cannot provide it. Data without its
   * schema cannot be restored into a new project, so null is reported loudly.
   */
  schemaDdl(): Promise<string | null>;
}

export interface TableSnapshot {
  primaryKey: string[];
  redactedColumns: string[];
  count: number;
  sha256: string;
  rows: Row[];
}

export interface Snapshot {
  format: string;
  version: number;
  createdAt: string;
  /** Supabase project ref, so a restore can refuse to run against the wrong project. */
  project: string;
  tables: Record<string, TableSnapshot>;
  authUsers: { count: number; sha256: string; users: AuthUserRecord[] };
  /** SQL to recreate the schema. `ddl` is null when it could not be captured. */
  schema: { ddl: string | null; sha256: string | null };
  excluded: Record<string, string>;
  warnings: string[];
}

export class CoverageError extends Error {
  readonly unclassified: string[];
  constructor(unclassified: string[]) {
    super(
      `The database has table(s) the backup does not know about: ${unclassified.join(', ')}.\n` +
        'Add each one to INCLUDE (if it holds data worth keeping) or EXCLUDE (with a reason) in ' +
        'scripts/backup/config.ts. The backup stops here so a new table is never silently left out.',
    );
    this.name = 'CoverageError';
    this.unclassified = unclassified;
  }
}

export class IncompleteExportError extends Error {
  // Plain fields, not constructor parameter properties: Node strips types
  // natively and that syntax is not erasable.
  readonly table: string;
  readonly before: number;
  readonly after: number;
  readonly got: number;
  constructor(table: string, before: number, after: number, got: number) {
    super(
      `Export of "${table}" is incomplete or unstable: the table had ${before} rows before reading, ` +
        `${after} after, and ${got} were received. No backup was written.`,
    );
    this.name = 'IncompleteExportError';
    this.table = table;
    this.before = before;
    this.after = after;
    this.got = got;
  }
}

export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

const pkKey = (row: Row, pk: string[]): string => JSON.stringify(pk.map((c) => row[c]));

export interface BuildOptions {
  include?: Record<string, TablePolicy>;
  exclude?: Record<string, string>;
  pageSize?: number;
  attempts?: number;
  project: string;
  now?: () => Date;
}

/** Reads one table completely, or throws. */
export async function readTable(db: Db, table: string, pk: string[], pageSize: number, attempts: number): Promise<Row[]> {
  let last: IncompleteExportError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const before = await db.count(table);
    const seen = new Map<string, Row>();
    let from = 0;

    // Advance by what actually came back rather than by what was asked for, so
    // a server that caps responses below `pageSize` still gets read in full.
    for (let requests = 0; requests < 100_000; requests++) {
      const batch = await db.page(table, from, from + pageSize - 1, pk);
      if (batch.length === 0) break;
      for (const row of batch) seen.set(pkKey(row, pk), row);
      from += batch.length;
    }

    const after = await db.count(table);
    if (before === after && seen.size === before) return [...seen.values()];
    last = new IncompleteExportError(table, before, after, seen.size);
  }
  throw last!;
}

export async function buildSnapshot(db: Db, opts: BuildOptions): Promise<Snapshot> {
  const include = opts.include ?? INCLUDE;
  const exclude = opts.exclude ?? EXCLUDE;
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const attempts = opts.attempts ?? MAX_CONSISTENCY_ATTEMPTS;
  const now = opts.now ?? (() => new Date());
  const warnings: string[] = [];

  // 1. Coverage -- before any data is read.
  const live = await db.listTables();
  const known = new Set([...Object.keys(include), ...Object.keys(exclude)]);
  const unclassified = live.filter((t) => !known.has(t)).sort();
  if (unclassified.length > 0) throw new CoverageError(unclassified);

  const liveSet = new Set(live);
  for (const t of Object.keys(include)) {
    if (!liveSet.has(t)) warnings.push(`Configured table "${t}" no longer exists in the database; skipped.`);
  }

  // 2. Read each table completely.
  const tables: Record<string, TableSnapshot> = {};
  for (const [name, policy] of Object.entries(include)) {
    if (!liveSet.has(name)) continue;
    const raw = await readTable(db, name, policy.primaryKey, pageSize, attempts);
    const redact = policy.redact ?? [];
    const rows = redact.length
      ? raw.map((r) => {
          const copy = { ...r };
          for (const col of redact) delete copy[col];
          return copy;
        })
      : raw;
    tables[name] = {
      primaryKey: policy.primaryKey,
      redactedColumns: redact,
      count: rows.length,
      sha256: sha256(JSON.stringify(rows)),
      rows,
    };
  }

  // 3. User records (from the auth service, which has no password hashes to leak).
  const { users, total } = await db.listAuthUsers();
  if (total !== null && users.length !== total) {
    throw new IncompleteExportError('auth.users', total, total, users.length);
  }

  // 4. The schema, so the data can be restored into a project that no longer has its tables.
  const ddl = await db.schemaDdl();
  if (ddl === null) {
    warnings.push(
      'Schema was NOT captured (the backup_schema_ddl function is not installed). The data in this backup ' +
        'can only be restored into a project whose tables already exist. Apply migration 0004.',
    );
  }

  // 5. Nothing credential-shaped may leave.
  assertNoSecrets({
    ...Object.fromEntries(Object.entries(tables).map(([n, t]) => [n, { primaryKey: t.primaryKey, rows: t.rows }])),
    'auth.users': { primaryKey: ['id'], rows: users as unknown as Row[] },
    schema: { primaryKey: ['kind'], rows: ddl === null ? [] : [{ kind: 'ddl', ddl }] },
  });

  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    createdAt: now().toISOString(),
    project: opts.project,
    tables,
    authUsers: { count: users.length, sha256: sha256(JSON.stringify(users)), users },
    schema: { ddl, sha256: ddl === null ? null : sha256(ddl) },
    excluded: exclude,
    warnings,
  };
}

/** The part of a snapshot that is safe to publish: counts and hashes, no rows. */
export function manifestOf(s: Snapshot) {
  return {
    format: s.format,
    version: s.version,
    createdAt: s.createdAt,
    project: s.project,
    tables: Object.fromEntries(Object.entries(s.tables).map(([n, t]) => [n, { count: t.count, sha256: t.sha256 }])),
    authUsers: { count: s.authUsers.count },
    schema: { captured: s.schema.ddl !== null, sha256: s.schema.sha256 },
    excludedTables: Object.keys(s.excluded),
    warnings: s.warnings,
  };
}

export interface VerifyResult {
  ok: boolean;
  problems: string[];
}

/** Confirms a decrypted snapshot is structurally sound and every hash and count still matches. */
export function verifySnapshot(value: unknown): VerifyResult {
  const problems: string[] = [];
  const s = value as Partial<Snapshot> | null;

  if (!s || typeof s !== 'object') return { ok: false, problems: ['Backup is not a JSON object.'] };
  if (s.format !== SNAPSHOT_FORMAT) problems.push(`Unexpected format "${String(s.format)}".`);
  if (s.version !== SNAPSHOT_VERSION) {
    problems.push(`Unsupported snapshot version ${String(s.version)} (this tool reads version ${SNAPSHOT_VERSION}).`);
  }
  if (!s.tables || typeof s.tables !== 'object') problems.push('Backup has no tables section.');

  for (const [name, t] of Object.entries(s.tables ?? {})) {
    if (!Array.isArray(t.rows)) {
      problems.push(`${name}: rows are missing.`);
      continue;
    }
    if (t.rows.length !== t.count) problems.push(`${name}: expected ${t.count} rows, found ${t.rows.length}.`);
    if (sha256(JSON.stringify(t.rows)) !== t.sha256) problems.push(`${name}: contents do not match their recorded hash.`);
  }

  const au = s.authUsers;
  if (au) {
    if (au.users.length !== au.count) problems.push(`auth users: expected ${au.count}, found ${au.users.length}.`);
    if (sha256(JSON.stringify(au.users)) !== au.sha256) problems.push('auth users: contents do not match their recorded hash.');
  }

  const sc = s.schema;
  if (sc && sc.ddl !== null && sha256(sc.ddl) !== sc.sha256) problems.push('schema: contents do not match their recorded hash.');

  return { ok: problems.length === 0, problems };
}
