/**
 * Run with:  npm run backup:test
 *
 * These exercise the safety properties of the backup against a stubbed
 * database, so each failure mode (silent truncation, a table changing mid-read,
 * a token in a text field...) can be forced on demand instead of waited for.
 * Nothing here touches a real database or network.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertRecipient, decryptJson, encryptJson, generateKeypair, parseIdentity } from './crypto.ts';
import type { TablePolicy } from './config.ts';
import { applyDiff, diffSnapshot, type RestoreDb } from './restore-lib.ts';
import { SecretFoundError } from './secret-scan.ts';
import {
  buildSnapshot,
  CoverageError,
  IncompleteExportError,
  manifestOf,
  verifySnapshot,
  type AuthUserRecord,
  type Db,
  type Row,
} from './snapshot.ts';

// ---------------------------------------------------------------------------
// Stub database
// ---------------------------------------------------------------------------

interface StubOptions {
  /** Most rows the "server" returns per request, like PostgREST's max_rows. */
  cap?: number;
  users?: AuthUserRecord[];
  usersTotal?: number | null;
  ddl?: string | null;
  /** Extra tables the database reports beyond the ones given data. */
  extraTables?: string[];
}

function stubDb(data: Record<string, Row[]>, opts: StubOptions = {}) {
  const queried = new Set<string>();
  const db: Db & { queried: Set<string>; data: Record<string, Row[]> } = {
    queried,
    data,
    async listTables() {
      return [...Object.keys(data), ...(opts.extraTables ?? [])];
    },
    async count(table) {
      queried.add(table);
      return data[table].length;
    },
    async page(table, from, to) {
      queried.add(table);
      const end = Math.min(to + 1, from + (opts.cap ?? 1000));
      return data[table].slice(from, end);
    },
    async listAuthUsers() {
      const users = opts.users ?? [];
      return { users, total: opts.usersTotal === undefined ? users.length : opts.usersTotal };
    },
    async schemaDdl() {
      return opts.ddl === undefined ? 'create table t();' : opts.ddl;
    },
  };
  return db;
}

const rowsOf = (n: number, extra: (i: number) => Row = () => ({})): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `id${String(i).padStart(5, '0')}`, amount: i, ...extra(i) }));

const POLICY: Record<string, TablePolicy> = {
  transactions: { primaryKey: ['id'] },
  subscriptions: { primaryKey: ['id'], redact: ['licenseKey'] },
};
const EXCLUDED = { keys: 'credentials', otps: 'ephemeral' };

const build = (db: Db, extra: Partial<Parameters<typeof buildSnapshot>[1]> = {}) =>
  buildSnapshot(db, { project: 'proj', include: POLICY, exclude: EXCLUDED, pageSize: 500, ...extra });

const baseData = () => ({
  transactions: rowsOf(1019),
  subscriptions: rowsOf(3, (i) => ({ plan: 'pro', licenseKey: `LIC-${i}-SECRET` })),
  keys: rowsOf(22, () => ({ key: 'should-never-be-read' })),
  otps: [],
});

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

test('encrypt/decrypt round-trips and the file is real age format', async () => {
  const { identity, recipient } = await generateKeypair();
  const enc = await encryptJson('{"hello":"₹ 1,23,456.78"}', recipient);
  assert.equal(Buffer.from(enc.subarray(0, 21)).toString(), 'age-encryption.org/v1');
  assert.equal(await decryptJson(enc, identity), '{"hello":"₹ 1,23,456.78"}');
});

test('a different private key cannot open the backup', async () => {
  const a = await generateKeypair();
  const b = await generateKeypair();
  const enc = await encryptJson('secret ledger', a.recipient);
  await assert.rejects(decryptJson(enc, b.identity), /not the matching private key, or the file is damaged/);
});

test('a flipped byte or a truncated file fails loudly instead of decrypting to wrong data', async () => {
  const { identity, recipient } = await generateKeypair();
  const enc = await encryptJson(JSON.stringify({ rows: rowsOf(200) }), recipient);

  const flipped = new Uint8Array(enc);
  flipped[flipped.length - 20] ^= 0x01;
  await assert.rejects(decryptJson(flipped, identity), /Could not decrypt/);

  await assert.rejects(decryptJson(enc.subarray(0, enc.length - 40), identity), /Could not decrypt/);
});

test('the server key setting rejects a PRIVATE key with a specific warning', async () => {
  const { identity, recipient } = await generateKeypair();
  assert.throws(() => assertRecipient(identity), /holds a PRIVATE key/);
  assert.throws(() => assertRecipient(''), /No backup public key/);
  assert.throws(() => assertRecipient('hello'), /not a valid age public key/);
  assert.equal(assertRecipient(`  ${recipient}\n`), recipient);
});

test('a key file with age comment lines parses to the bare secret', async () => {
  const { identity, recipient } = await generateKeypair();
  const file = `# created: 2026-11-06\n# public key: ${recipient}\n${identity}\n`;
  assert.equal(parseIdentity(file), identity);
  assert.throws(() => parseIdentity('# only a comment\n'), /not an age private key/);
});

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

test('reads every row of a table larger than one page', async () => {
  const s = await build(stubDb(baseData()));
  assert.equal(s.tables.transactions.count, 1019);
  assert.equal(new Set(s.tables.transactions.rows.map((r) => r.id)).size, 1019);
});

test('a server that silently caps responses below the page size is still read in full', async () => {
  // PostgREST truncates quietly. This is the failure that once lost data.
  const s = await build(stubDb(baseData(), { cap: 100 }));
  assert.equal(s.tables.transactions.count, 1019);
});

test('a response that stops early is an error, not a short backup', async () => {
  const data = baseData();
  const db = stubDb(data);
  const realPage = db.page;
  // Pages start at 0 and 500, so cutting off at 500 means exactly one page arrives.
  db.page = async (t, from, to, o) => (t === 'transactions' && from >= 500 ? [] : realPage(t, from, to, o));

  await assert.rejects(build(db), (err: unknown) => {
    assert.ok(err instanceof IncompleteExportError);
    assert.equal(err.table, 'transactions');
    assert.equal(err.got, 500);
    assert.equal(err.before, 1019);
    return true;
  });
});

test('a table that changes while being read is re-read until it is consistent', async () => {
  const data = baseData();
  const db = stubDb(data);
  const realPage = db.page;
  let injected = false;
  db.page = async (t, from, to, o) => {
    const out = await realPage(t, from, to, o);
    // A write lands after the first pass has read its rows.
    if (t === 'transactions' && out.length === 0 && !injected) {
      injected = true;
      data.transactions.push({ id: 'id99999', amount: 1 });
    }
    return out;
  };
  const s = await build(db);
  assert.equal(injected, true);
  assert.equal(s.tables.transactions.count, 1020, 'the second, consistent pass includes the new row');
});

test('an unclassified table stops the backup before any data is read', async () => {
  const db = stubDb(baseData(), { extraTables: ['brand_new_table'] });
  await assert.rejects(build(db), (err: unknown) => {
    assert.ok(err instanceof CoverageError);
    assert.deepEqual(err.unclassified, ['brand_new_table']);
    return true;
  });
  assert.equal(db.queried.size, 0, 'no table was read');
});

test('excluded tables are never even queried', async () => {
  const db = stubDb(baseData());
  const s = await build(db);
  assert.ok(!db.queried.has('keys') && !db.queried.has('otps'));
  assert.deepEqual(Object.keys(s.tables).sort(), ['subscriptions', 'transactions']);
  assert.deepEqual(Object.keys(s.excluded).sort(), ['keys', 'otps']);
});

test('a user list shorter than the reported total is an error', async () => {
  const users = [{ id: 'u1' }] as unknown as AuthUserRecord[];
  await assert.rejects(build(stubDb(baseData(), { users, usersTotal: 5 })), IncompleteExportError);
});

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

test('redacted columns are removed from every row', async () => {
  const s = await build(stubDb(baseData()));
  for (const row of s.tables.subscriptions.rows) assert.ok(!('licenseKey' in row));
  assert.ok(!JSON.stringify(s).includes('SECRET'), 'no licence key text anywhere in the snapshot');
});

test('a token pasted into a text field aborts the backup without echoing it', async () => {
  // Assembled at runtime so no token-shaped string sits in the source for secret scanners to flag.
  // The payload is a dummy ({"test":"dummy"}); it is not a real credential.
  const jwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJ0ZXN0IjoiZHVtbXkifQ', 'c2lnbmF0dXJlYWJj'].join('.');
  const data = baseData();
  data.transactions[7] = { id: 'tx-with-token', amount: 5, description: `paid via ${jwt}` };

  await assert.rejects(build(stubDb(data)), (err: unknown) => {
    assert.ok(err instanceof SecretFoundError);
    assert.match(err.message, /transactions \[tx-with-token\] column "description": looks like a JWT/);
    assert.ok(!err.message.includes(jwt) && !err.message.includes('eyJ'), 'the value is never printed');
    return true;
  });
});

test('credential-shaped values are found inside jsonb, not just top-level columns', async () => {
  const data = baseData();
  // Built from parts: a literal live-key prefix in source would itself trip secret scanners.
  data.transactions[0] = { id: 'x', meta: { nested: [{ k: ['sk', 'live', 'abcdefghijklmnop1234'].join('_') }] } };
  await assert.rejects(build(stubDb(data)), /Stripe\/Razorpay-style secret key/);
});

test('ordinary business text that merely mentions the word "token" does not stop the backup', async () => {
  const data = baseData();
  data.transactions[0] = { id: 'x', description: 'Token Traders - password protected PDF, secret santa gift' };
  const s = await build(stubDb(data));
  assert.equal(s.tables.transactions.count, 1019);
});

test('the manifest carries counts and hashes only, never business data', async () => {
  const data = baseData();
  data.transactions[0] = { id: 'x', description: 'DISTINCTIVE-CUSTOMER-NAME' };
  const m = JSON.stringify(manifestOf(await build(stubDb(data))));
  assert.ok(!m.includes('DISTINCTIVE-CUSTOMER-NAME'));
  assert.ok(m.includes('"transactions"') && m.includes('"count":1019'));
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

test('a missing schema function is a visible warning, not a silent gap', async () => {
  const s = await build(stubDb(baseData(), { ddl: null }));
  assert.equal(s.schema.ddl, null);
  assert.match(s.warnings.join('\n'), /Schema was NOT captured/);
  assert.equal(manifestOf(s).schema.captured, false);
});

test('a captured schema is stored and hashed', async () => {
  const s = await build(stubDb(baseData(), { ddl: 'create table accounts (id text primary key);' }));
  assert.equal(s.schema.ddl, 'create table accounts (id text primary key);');
  assert.match(s.schema.sha256 ?? '', /^[0-9a-f]{64}$/);
  assert.equal(verifySnapshot(s).ok, true);
});

// ---------------------------------------------------------------------------
// Verification and restore
// ---------------------------------------------------------------------------

test('a full encrypt -> decrypt -> verify round trip preserves every row exactly', async () => {
  const { identity, recipient } = await generateKeypair();
  const snapshot = await build(stubDb(baseData(), { users: [{ id: 'u1', email: 'a@b.c' } as AuthUserRecord] }));
  const reopened = JSON.parse(await decryptJson(await encryptJson(JSON.stringify(snapshot), recipient), identity));

  assert.deepEqual(verifySnapshot(reopened), { ok: true, problems: [] });
  assert.deepEqual(reopened.tables.transactions.rows, snapshot.tables.transactions.rows);
});

test('verification catches an altered value, a removed row and an unknown version', async () => {
  const fresh = async () => JSON.parse(JSON.stringify(await build(stubDb(baseData()))));

  const altered = await fresh();
  altered.tables.transactions.rows[5].amount = 999999;
  assert.match(verifySnapshot(altered).problems.join(), /transactions: contents do not match/);

  const dropped = await fresh();
  dropped.tables.transactions.rows.pop();
  assert.match(verifySnapshot(dropped).problems.join(), /transactions: expected 1019 rows, found 1018/);

  const future = await fresh();
  future.version = 99;
  assert.match(verifySnapshot(future).problems.join(), /Unsupported snapshot version 99/);
});

/** A restore target that records every write, so "never deletes" is checkable. */
function stubRestoreDb(live: Record<string, Row[]>) {
  const ops: string[] = [];
  const db: RestoreDb & { ops: string[]; live: Record<string, Row[]> } = {
    ops,
    live,
    readAll: async (t) => live[t] ?? [],
    insertMissing: async (t, pk, rows) => {
      ops.push(`insertMissing:${t}:${rows.length}`);
      const have = new Set(live[t].map((r) => JSON.stringify(pk.map((c) => r[c]))));
      for (const r of rows) if (!have.has(JSON.stringify(pk.map((c) => r[c])))) live[t].push(r);
    },
    upsert: async (t, pk, rows) => {
      ops.push(`upsert:${t}:${rows.length}`);
      for (const r of rows) {
        const i = live[t].findIndex((x) => pk.every((c) => x[c] === r[c]));
        if (i >= 0) live[t][i] = { ...live[t][i], ...r };
        else live[t].push(r);
      }
    },
  };
  return db;
}

test('diff classifies rows as missing, changed, unchanged and live-only', async () => {
  const snapshot = await build(stubDb({ ...baseData(), transactions: rowsOf(10) }));
  const live = rowsOf(10).slice(2); // 2 rows deleted from live
  live[0] = { ...live[0], amount: 12345 }; // 1 edited since the backup
  live.push({ id: 'new-since-backup', amount: 1 }); // 1 added since the backup

  const [d] = (await diffSnapshot(snapshot, stubRestoreDb({ transactions: live, subscriptions: [] }), ['transactions']));
  assert.equal(d.missing.length, 2);
  assert.equal(d.changed.length, 1);
  assert.equal(d.unchanged, 7);
  assert.equal(d.liveOnly, 1);
});

test('apply restores only the missing rows: no edit is reverted, nothing is deleted', async () => {
  const snapshot = await build(stubDb({ ...baseData(), transactions: rowsOf(10) }));
  const liveRows = rowsOf(10).slice(2);
  liveRows[0] = { ...liveRows[0], amount: 12345 };
  liveRows.push({ id: 'new-since-backup', amount: 1 });
  const target = stubRestoreDb({ transactions: liveRows, subscriptions: [] });

  const diffs = await diffSnapshot(snapshot, target, ['transactions']);
  const [report] = await applyDiff(diffs, target, { overwrite: false });

  assert.equal(report.inserted, 2);
  assert.equal(report.overwritten, 0);
  assert.equal(target.live.transactions.length, 11, '8 kept + 2 restored + 1 live-only');
  assert.equal(target.live.transactions.find((r) => r.id === 'id00002')?.amount, 12345, 'the newer edit survives');
  assert.ok(target.live.transactions.some((r) => r.id === 'new-since-backup'), 'live-only row kept');
  assert.ok(target.ops.every((o) => !o.startsWith('upsert')), 'no overwrite without --overwrite');
});

test('--overwrite also replaces changed rows, and still deletes nothing', async () => {
  const snapshot = await build(stubDb({ ...baseData(), transactions: rowsOf(10) }));
  const liveRows = rowsOf(10);
  liveRows[3] = { ...liveRows[3], amount: 777 };
  liveRows.push({ id: 'live-only', amount: 1 });
  const target = stubRestoreDb({ transactions: liveRows, subscriptions: [] });

  const diffs = await diffSnapshot(snapshot, target, ['transactions']);
  const [report] = await applyDiff(diffs, target, { overwrite: true });

  assert.equal(report.overwritten, 1);
  assert.equal(target.live.transactions.find((r) => r.id === 'id00003')?.amount, 3);
  assert.equal(target.live.transactions.length, 11);
});

test('redacted columns are ignored in comparisons, so a restore cannot blank a licence key', async () => {
  const snapshot = await build(stubDb({ ...baseData(), transactions: [] }));
  // Live still HAS the licence key; the backup deliberately does not.
  const live = baseData().subscriptions;
  const target = stubRestoreDb({ transactions: [], subscriptions: live });

  const diffs = await diffSnapshot(snapshot, target, ['subscriptions']);
  assert.equal(diffs[0].changed.length, 0);
  assert.equal(diffs[0].unchanged, 3);

  await applyDiff(diffs, target, { overwrite: true });
  assert.ok(target.live.subscriptions.every((r) => String(r.licenseKey).startsWith('LIC-')), 'keys untouched');
});
