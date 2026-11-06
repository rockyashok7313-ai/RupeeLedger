/**
 * Creates one encrypted backup file.
 *
 *   npm run backup:run
 *   npm run backup:run -- --out-dir D:\\backups
 *
 * Needs, from the environment (never from arguments, so nothing lands in shell
 * history or a process listing):
 *
 *   SUPABASE_URL                 project URL
 *   SUPABASE_SERVICE_ROLE_KEY    server key; reads every table
 *   BACKUP_AGE_RECIPIENT         the PUBLIC key ("age1...") from backup:keygen
 *
 * Writes two files:
 *
 *   rupeeledger-<UTC time>.json.gz.age   the backup. Unreadable without the private key.
 *   rupeeledger-<UTC time>.manifest.json  counts and hashes only. Contains no business data.
 *
 * Exits non-zero, writing nothing, if the export is incomplete, an unclassified
 * table exists, or anything credential-shaped was found. A failed night should
 * be loud, never a short backup that looks fine.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { assertRecipient, decryptJson, encryptJson, looksLikeAge } from './crypto.ts';
import { buildSnapshot, manifestOf, verifySnapshot } from './snapshot.ts';
import { createSupabaseDb, readSupabaseEnv } from './supabase-db.ts';

const { values } = parseArgs({
  options: {
    'out-dir': { type: 'string' },
    // Optional: lets the owner prove, on their own machine, that the file they
    // just made can really be opened. CI never has this, by design.
    'identity-file': { type: 'string' },
    // Print per-table counts even on CI (off by default: public-repo logs are public).
    verbose: { type: 'boolean' },
  },
});

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

/** Writes via a temp file so a crash never leaves a half-written backup under the real name. */
function writeAtomic(file: string, data: Uint8Array | string) {
  const tmp = `${file}.partial`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

try {
  const recipient = assertRecipient(process.env.BACKUP_AGE_RECIPIENT);
  const { db, project } = createSupabaseDb(readSupabaseEnv());

  console.log(`Reading project ${project}...`);
  const snapshot = await buildSnapshot(db, { project });

  const encrypted = await encryptJson(JSON.stringify(snapshot), recipient);
  if (!looksLikeAge(encrypted)) throw new Error('Encryption produced something that is not an age file; aborting.');

  const outDir = path.resolve(values['out-dir'] ?? 'backups-out');
  mkdirSync(outDir, { recursive: true });
  const base = `rupeeledger-${stamp(new Date(snapshot.createdAt))}`;
  const backupFile = path.join(outDir, `${base}.json.gz.age`);
  const manifestFile = path.join(outDir, `${base}.manifest.json`);

  const manifest = {
    ...manifestOf(snapshot),
    file: path.basename(backupFile),
    bytes: encrypted.byteLength,
    encryptedSha256: createHash('sha256').update(encrypted).digest('hex'),
  };
  writeAtomic(backupFile, encrypted);
  writeAtomic(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  // --- optional proof that the file opens -----------------------------------
  let verified = 'not checked (no private key on this machine, which is how the server should be)';
  const identitySource = values['identity-file']
    ? readFileSync(values['identity-file'], 'utf8')
    : process.env.BACKUP_AGE_IDENTITY;
  if (identitySource) {
    const reopened = JSON.parse(await decryptJson(encrypted, identitySource));
    const result = verifySnapshot(reopened);
    if (!result.ok) throw new Error(`The file was written but fails verification:\n  ${result.problems.join('\n  ')}`);
    verified = 'decrypted and every table hash and count matched';
  }

  // --- summary: counts only, never rows --------------------------------------
  // On GitHub Actions in a public repository the log is world-readable, so there
  // the summary leaves out per-table row counts (they reveal business volume).
  const inCi = process.env.GITHUB_ACTIONS === 'true' && !values.verbose;
  const rows = Object.entries(snapshot.tables).filter(([, t]) => t.count > 0);
  console.log(`
Backup written: ${backupFile}`);
  console.log(`  size          ${(encrypted.byteLength / 1024).toFixed(1)} KiB encrypted`);
  if (inCi) {
    console.log(`  tables        ${Object.keys(snapshot.tables).length} backed up (counts hidden in CI logs; see the manifest)`);
  } else {
    const total = rows.reduce((n, [, t]) => n + t.count, 0);
    console.log(`  rows          ${total} across ${rows.length} non-empty tables (${Object.keys(snapshot.tables).length} backed up)`);
    for (const [name, t] of rows) console.log(`    ${name.padEnd(22)} ${String(t.count).padStart(6)}`);
    console.log(`  user records  ${snapshot.authUsers.count}`);
  }
  console.log(`  schema        ${snapshot.schema.ddl === null ? 'NOT captured' : 'captured'}`);
  console.log(`  left out      ${Object.keys(snapshot.excluded).join(', ')} (credentials / ephemeral)`);
  console.log(`  check         ${verified}`);
  for (const w of snapshot.warnings) console.warn(`\nWARNING: ${w}`);
} catch (err) {
  console.error(`\nBackup FAILED: ${err instanceof Error ? err.message : String(err)}`);
  // exitCode, not process.exit(): exiting with sockets still open crashes Node on Windows.
  process.exitCode = 1;
}
