/**
 * Encryption for off-site backups, using the standard `age` format.
 *
 * Why age, and why public-key:
 *
 *   - The machine that creates backups (a scheduled CI job) only ever holds the
 *     PUBLIC key (`age1...`). It can write backups but cannot read any of them,
 *     so a leaked CI secret does not expose old backups. The private key
 *     (`AGE-SECRET-KEY-1...`) lives only with the owner, offline.
 *
 *   - It is an open, audited format. If this repository disappears, a backup
 *     still opens with the stock `age` command-line tool:
 *
 *         age -d -i key.txt backup.json.gz.age | gunzip > backup.json
 *
 *     That matters for a backup: it has to be restorable years later by
 *     someone who does not have this code.
 *
 *   - It authenticates the whole file. A flipped bit or truncated download makes
 *     decryption fail loudly instead of producing quietly wrong figures.
 *
 * Plain X25519 keys are used rather than the post-quantum hybrid variant so any
 * age release can open the files; the backups sit in a private bucket, not in
 * public view.
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import { Decrypter, Encrypter, generateX25519Identity, identityToRecipient } from 'age-encryption';

const RECIPIENT_RE = /^age1[a-z0-9]{50,}$/;
const IDENTITY_RE = /^AGE-SECRET-KEY-1[A-Z0-9]{50,}$/;

export const AGE_HEADER = 'age-encryption.org/v1';

/** Create a new keypair. The identity is the secret; the recipient is safe to share. */
export async function generateKeypair(): Promise<{ identity: string; recipient: string }> {
  const identity = await generateX25519Identity();
  return { identity, recipient: await identityToRecipient(identity) };
}

/** Throws a plain-English error if `value` is not an age public key. */
export function assertRecipient(value: string | undefined): string {
  const v = (value ?? '').trim();
  if (!v) {
    throw new Error('No backup public key set. Provide BACKUP_AGE_RECIPIENT (an "age1..." string).');
  }
  if (v.startsWith('AGE-SECRET-KEY')) {
    // The single most damaging mistake available here, so it gets its own message.
    throw new Error(
      'BACKUP_AGE_RECIPIENT holds a PRIVATE key (AGE-SECRET-KEY-...). Put only the public "age1..." key ' +
        'on the server and keep the private key offline. Rotate this keypair: treat it as exposed.',
    );
  }
  if (!RECIPIENT_RE.test(v)) {
    throw new Error('BACKUP_AGE_RECIPIENT is not a valid age public key (expected "age1...").');
  }
  return v;
}

/** Pulls the secret key out of a file that may also contain age's "# created:" comment lines. */
export function parseIdentity(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!line || !IDENTITY_RE.test(line)) {
    throw new Error('That is not an age private key (expected a line starting "AGE-SECRET-KEY-1").');
  }
  return line;
}

/** gzip then encrypt. Returns the bytes of a `.json.gz.age` file. */
export async function encryptJson(plaintext: string, recipient: string): Promise<Uint8Array> {
  const enc = new Encrypter();
  enc.addRecipient(assertRecipient(recipient));
  return enc.encrypt(new Uint8Array(gzipSync(Buffer.from(plaintext, 'utf8'), { level: 9 })));
}

/** Decrypt then gunzip. Throws if the key is wrong or the file was altered or truncated. */
export async function decryptJson(ciphertext: Uint8Array, identity: string): Promise<string> {
  const dec = new Decrypter();
  dec.addIdentity(parseIdentity(identity));
  let gz: Uint8Array;
  try {
    gz = await dec.decrypt(ciphertext);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not decrypt this backup (${msg}). Either this is not the matching private key, ` +
        'or the file is damaged or incomplete.',
    );
  }
  return gunzipSync(Buffer.from(gz)).toString('utf8');
}

/** True if the bytes look like an age file at all (cheap check for CI, which has no private key). */
export function looksLikeAge(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, AGE_HEADER.length)).toString('latin1') === AGE_HEADER;
}
