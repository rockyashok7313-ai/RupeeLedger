/**
 * Opens, checks and (only when told to) restores an encrypted backup.
 *
 *   npm run backup:restore -- <file.json.gz.age> --identity-file <key.txt>
 *
 * With only those arguments it decrypts in memory, proves every table's count
 * and hash, and prints a summary. It writes nothing anywhere.
 *
 * Going further, each step is opt-in:
 *
 *   --diff                     compare with the live database (read-only; needs SUPABASE_* env)
 *   --apply                    add rows that are MISSING from the live database
 *   --overwrite                with --apply: also replace rows whose values differ
 *   --confirm-project <ref>    REQUIRED with --apply. Must equal the ref of the project being
 *                              written to, so a restore can never hit the wrong one by accident
 *   --tables a,b               limit to these tables
 *   --schema-out <file>        write the schema SQL (needed for a brand-new, empty project)
 *   --out <file>               write the decrypted JSON. PLAINTEXT on disk: delete it afterwards
 *
 * Restore NEVER deletes anything, and never touches columns the backup left out
 * (PIN hashes, licence keys), so it cannot blank out a credential.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { decryptJson } from './crypto.ts';
import { applyDiff, diffSnapshot } from './restore-lib.ts';
import { verifySnapshot, type Snapshot } from './snapshot.ts';
import { createRestoreDb, createSupabaseDb, readSupabaseEnv } from './supabase-db.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'identity-file': { type: 'string' },
    diff: { type: 'boolean' },
    apply: { type: 'boolean' },
    overwrite: { type: 'boolean' },
    'confirm-project': { type: 'string' },
    tables: { type: 'string' },
    'schema-out': { type: 'string' },
    out: { type: 'string' },
  },
});

/** A deliberate stop with a message for the user, as opposed to an unexpected crash. */
class Stop extends Error {}
const fail = (msg: string): never => {
  throw new Stop(msg);
};

const file = positionals[0];

try {
  if (!file) fail('give the backup file: npm run backup:restore -- <file.json.gz.age> --identity-file <key.txt>');
  if (values.overwrite && !values.apply) fail('--overwrite only makes sense together with --apply.');

  const identity = values['identity-file'] ? readFileSync(values['identity-file'], 'utf8') : process.env.BACKUP_AGE_IDENTITY;
  if (!identity) fail('no private key. Pass --identity-file <path> or set BACKUP_AGE_IDENTITY.');

  const plaintext = await decryptJson(new Uint8Array(readFileSync(file!)), identity!);
  const snapshot = JSON.parse(plaintext) as Snapshot;

  const check = verifySnapshot(snapshot);
  if (!check.ok) fail(`this backup failed verification:\n  ${check.problems.join('\n  ')}`);

  const only = values.tables ? values.tables.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  if (only) {
    const unknown = only.filter((t) => !(t in snapshot.tables));
    if (unknown.length) fail(`not in this backup: ${unknown.join(', ')}`);
  }

  // --- 1. what is in it ------------------------------------------------------
  console.log(`Backup taken   ${snapshot.createdAt}`);
  console.log(`From project   ${snapshot.project}`);
  console.log('Integrity      OK: every table count and SHA-256 matches\n');
  for (const [name, t] of Object.entries(snapshot.tables)) {
    if (t.count > 0) console.log(`  ${name.padEnd(22)} ${String(t.count).padStart(6)} rows`);
  }
  console.log(`  ${'user records'.padEnd(22)} ${String(snapshot.authUsers.count).padStart(6)}`);
  console.log(`\nSchema         ${snapshot.schema.ddl === null ? 'NOT in this backup' : 'included'}`);
  console.log(`Left out       ${Object.keys(snapshot.excluded).join(', ')}`);
  for (const w of snapshot.warnings) console.warn(`WARNING: ${w}`);

  if (values['schema-out']) {
    if (snapshot.schema.ddl === null) fail('this backup has no schema to write.');
    writeFileSync(values['schema-out'], snapshot.schema.ddl!);
    console.log(`\nSchema SQL written to ${values['schema-out']}`);
  }
  if (values.out) {
    writeFileSync(values.out, JSON.stringify(snapshot, null, 2));
    console.log(`\nDecrypted JSON written to ${values.out}  (PLAINTEXT: delete it when finished)`);
  }

  // --- 2. compare / write -----------------------------------------------------
  if (values.diff || values.apply) {
    const env = readSupabaseEnv();
    const { db, client, project: target } = createSupabaseDb(env);
    const live = createRestoreDb(client, db);

    if (target !== snapshot.project) {
      console.log(`\nNote: restoring into project "${target}", not the original "${snapshot.project}".`);
    }

    console.log(`\nComparing with live project ${target} (read-only)...`);
    const diffs = await diffSnapshot(snapshot, live, only);
    console.log(`\n  ${'table'.padEnd(22)} ${'backup'.padStart(7)} ${'missing'.padStart(8)} ${'changed'.padStart(8)} ${'same'.padStart(7)} ${'live-only'.padStart(10)}`);
    for (const d of diffs) {
      if (d.inBackup === 0 && d.liveOnly === 0) continue;
      console.log(
        `  ${d.table.padEnd(22)} ${String(d.inBackup).padStart(7)} ${String(d.missing.length).padStart(8)} ` +
          `${String(d.changed.length).padStart(8)} ${String(d.unchanged).padStart(7)} ${String(d.liveOnly).padStart(10)}`,
      );
    }
    console.log('\n  missing   = in the backup, absent from live (restorable)');
    console.log('  changed   = in both, values differ');
    console.log('  live-only = in live, not in the backup (always kept)');

    if (values.apply) {
      if (values['confirm-project'] !== target) {
        fail(
          `--apply needs --confirm-project ${target}\n` +
            '  (type the ref of the project you are writing to; this stops a restore reaching the wrong one)',
        );
      }
      const reports = await applyDiff(diffs, live, { overwrite: Boolean(values.overwrite) });
      console.log('\nApplied:');
      for (const r of reports) {
        if (r.inserted || r.overwritten) console.log(`  ${r.table.padEnd(22)} +${r.inserted} added, ${r.overwritten} overwritten`);
      }
      console.log('\nNothing was deleted. Re-run with --diff to confirm "missing" is now 0.');
    } else {
      console.log('\nNothing was written. Add --apply --confirm-project <ref> to restore the missing rows.');
    }
  }
} catch (err) {
  console.error(`\nRestore stopped: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1; // not process.exit(): that crashes Node on Windows with sockets open
}
