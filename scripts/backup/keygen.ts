/**
 * Creates the keypair for off-site backups.
 *
 *   npm run backup:keygen
 *   npm run backup:keygen -- --out D:\\somewhere\\backup-key.txt
 *
 * The PRIVATE key is written to a file and is never printed, so it does not end
 * up in terminal scrollback, a screen recording or a CI log. Only the PUBLIC
 * key ("age1...") is printed: that is the one that goes into the server's
 * BACKUP_AGE_RECIPIENT setting.
 *
 * Losing the private key makes every backup permanently unreadable. Nobody,
 * including whoever wrote this tool, can recover a backup without it. Store
 * the file in a password manager AND on one offline copy (a USB drive, or
 * printed), then delete the original.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { generateKeypair } from './crypto.ts';

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const target = path.resolve(values.out ?? path.join(os.homedir(), 'rupeeledger-backup-key.txt'));

// A key file inside the project folder is one `git add .` away from a public repo.
const rel = path.relative(process.cwd(), target);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
  console.error(
    `Refusing to write the private key inside the project folder (${target}).\n` +
      'Choose a location outside the repository, e.g. your home folder (the default).',
  );
  process.exit(1);
}

const { identity, recipient } = await generateKeypair();

try {
  mkdirSync(path.dirname(target), { recursive: true });
  // 'wx' fails if the file exists: never overwrite a key that may protect real backups.
  writeFileSync(
    target,
    `# RupeeLedger off-site backup PRIVATE key. Created ${new Date().toISOString()}\n` +
      `# public key: ${recipient}\n${identity}\n`,
    { flag: 'wx', mode: 0o600 },
  );
} catch (err) {
  const code = (err as NodeJS.ErrnoException).code;
  console.error(
    code === 'EEXIST'
      ? `A file already exists at ${target}. Not overwriting it: it may be the key your backups depend on.\n` +
          'Pass --out with a different path.'
      : `Could not write the key file: ${(err as Error).message}`,
  );
  process.exit(1);
}

console.log(`Private key written to:\n  ${target}\n`);
console.log('Public key (this is the only part that goes on the server):\n');
console.log(`  ${recipient}\n`);
console.log('Next:');
console.log('  1. Copy the private key file into your password manager and onto one offline copy.');
console.log('  2. Delete the original file once both copies are confirmed.');
console.log('  3. Set the public key as the BACKUP_AGE_RECIPIENT secret (see docs/OFFSITE_BACKUP.md).');
console.log('\nIf the private key is lost, every backup is permanently unreadable.');
