/**
 * The Supabase adapter, exercised over HTTP against a fake PostgREST + auth
 * server. This is what stands in for a live run: it checks the request shapes
 * (ordering, offset/limit, count headers, the service-role gate) and how
 * responses are parsed, without needing the real key.
 *
 * It does NOT prove the real project behaves the same. Only running
 * `npm run backup:run` with the real key does that; see docs/OFFSITE_BACKUP.md.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXCLUDE, INCLUDE } from './config.ts';
import { applyDiff, diffSnapshot } from './restore-lib.ts';
import { buildSnapshot, CoverageError, type Row } from './snapshot.ts';
import { authHeaders, createRestoreDb, createSupabaseDb, parseTableNames } from './supabase-db.ts';

const URL_BASE = 'https://abcd1234.supabase.co';
// A dummy that merely starts like a JWT (so it is sent in both headers); assembled to avoid a token-shaped literal.
const KEY = ['eyJhbGciOiJIUzI1NiJ9', 'dummy-payload', 'dummy-signature'].join('.');

interface World {
  tables: Record<string, Row[]>;
  users?: Record<string, unknown>[];
  /** undefined = function missing (PGRST202); string = its output. */
  ddl?: string;
  cap?: number;
  specTables?: string[];
}

function fakeSupabase(world: World) {
  const calls: { method: string; path: string; search: string; prefer: string; body: string }[] = [];
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });

  const fetchImpl: typeof fetch = async (input, init) => {
    const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    calls.push({ method, path: u.pathname, search: u.search, prefer: headers.get('prefer') ?? '', body: typeof init?.body === 'string' ? init.body : '' });

    if (headers.get('apikey') !== KEY) return json(401, { message: 'Invalid API key' });

    // PostgREST schema document
    if (u.pathname === '/rest/v1/') {
      const names = world.specTables ?? Object.keys(world.tables);
      return json(200, {
        swagger: '2.0',
        definitions: Object.fromEntries(names.map((n) => [n, { type: 'object' }])),
        paths: { '/': {}, ...Object.fromEntries(names.map((n) => [`/${n}`, {}])), '/rpc/backup_schema_ddl': {} },
      });
    }

    // RPC
    if (u.pathname === '/rest/v1/rpc/backup_schema_ddl') {
      return world.ddl === undefined
        ? json(404, { code: 'PGRST202', message: 'Could not find the function public.backup_schema_ddl' })
        : json(200, world.ddl);
    }

    // Tables
    const m = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (m) {
      const rows = world.tables[m[1]];
      if (!rows) return json(404, { code: 'PGRST205', message: 'not found' });
      const total = rows.length;
      if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `*/${total}` } });
      // Upserts: accept and record (inspected by the tests); nothing is stored.
      if (method === 'POST') return new Response(null, { status: 201 });

      const offset = Number(u.searchParams.get('offset') ?? 0);
      const limit = Number(u.searchParams.get('limit') ?? total);
      const slice = rows.slice(offset, offset + Math.min(limit, world.cap ?? 1000));
      const end = offset + slice.length - 1;
      return json(200, slice, { 'content-range': slice.length ? `${offset}-${end}/${total}` : `*/${total}` });
    }

    // Auth admin: user list with the total in a header, as GoTrue does
    if (u.pathname === '/auth/v1/admin/users') {
      const all = world.users ?? [];
      const page = Number(u.searchParams.get('page') ?? 1);
      const perPage = Number(u.searchParams.get('per_page') ?? 50);
      const slice = all.slice((page - 1) * perPage, page * perPage);
      const last = Math.max(1, Math.ceil(all.length / perPage));
      return json(
        200,
        { users: slice, aud: 'authenticated' },
        {
          'x-total-count': String(all.length),
          link: `<${URL_BASE}/auth/v1/admin/users?page=${Math.min(page + 1, last)}&per_page=${perPage}>; rel="next", <${URL_BASE}/auth/v1/admin/users?page=${last}&per_page=${perPage}>; rel="last"`,
        },
      );
    }
    return json(404, { message: `unhandled ${method} ${u.pathname}` });
  };
  return { fetchImpl, calls };
}

const adapter = (world: World, key = KEY) => {
  const fake = fakeSupabase(world);
  return { ...fake, ...createSupabaseDb({ url: URL_BASE, serviceKey: key }, fake.fetchImpl) };
};

const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${String(i).padStart(5, '0')}`, n: i }));

// ---------------------------------------------------------------------------

test('JWT-style keys go in both headers; opaque sb_secret keys go in apikey only', () => {
  assert.deepEqual(Object.keys(authHeaders('eyJabc')).sort(), ['Authorization', 'apikey']);
  assert.deepEqual(Object.keys(authHeaders('sb_secret_abc')), ['apikey']);
});

test('table names come from definitions, falling back to paths without rpc entries', () => {
  assert.deepEqual(parseTableNames({ definitions: { a: {}, b: {} } }), ['a', 'b']);
  assert.deepEqual(parseTableNames({ paths: { '/': {}, '/a': {}, '/rpc/f': {}, '/b': {} } }), ['a', 'b']);
  assert.throws(() => parseTableNames({ definitions: {} }), /no tables/);
});

test('a wrong key fails with a clear message that does not leak the key', async () => {
  const { db } = adapter({ tables: { a: rows(1) } }, 'eyJwrong.key.here');
  await assert.rejects(db.listTables(), (err: unknown) => {
    const msg = (err as Error).message;
    assert.match(msg, /Could not list tables \(HTTP 401\)/);
    assert.ok(!msg.includes('eyJwrong'));
    return true;
  });
});

test('count uses an exact count and reads it from the content-range header', async () => {
  const { db } = adapter({ tables: { transactions: rows(1019) } });
  assert.equal(await db.count('transactions'), 1019);
});

test('paging sends order + offset + limit, and a capped server is still read in full', async () => {
  const { db, calls } = adapter({ tables: { transactions: rows(1019) }, cap: 100 });
  const snap = await buildSnapshot(db, {
    project: 'abcd1234',
    include: { transactions: { primaryKey: ['id'] } },
    exclude: {},
  });
  assert.equal(snap.tables.transactions.count, 1019);

  const reads = calls.filter((c) => c.method === 'GET' && c.path === '/rest/v1/transactions');
  assert.ok(reads.every((c) => c.search.includes('order=id.asc')), 'ordered by primary key');
  assert.ok(reads.some((c) => c.search.includes('offset=500')), 'advances by what was actually returned');
});

test('the schema function: missing -> null, present -> text, other errors -> thrown', async () => {
  assert.equal(await adapter({ tables: { a: [] } }).db.schemaDdl(), null);
  assert.equal(await adapter({ tables: { a: [] }, ddl: 'create table a();' }).db.schemaDdl(), 'create table a();');

  const broken = adapter({ tables: { a: [] }, ddl: '' });
  await assert.rejects(broken.db.schemaDdl(), /returned nothing/);
});

test('users are paged, mapped to a whitelist, and never carry credential fields', async () => {
  const users = Array.from({ length: 1500 }, (_, i) => ({
    id: `u${String(i).padStart(4, '0')}`,
    email: `u${i}@example.com`,
    phone: '',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'google' },
    user_metadata: { name: `User ${i}` },
    identities: [{ provider: 'google' }],
    // Things that must never be copied even if a server returned them:
    encrypted_password: 'bcrypt-hash-should-not-appear',
    recovery_token: 'token-should-not-appear',
    confirmation_token: 'token-should-not-appear',
  }));
  const { db } = adapter({ tables: { a: [] }, users });
  const { users: got, total } = await db.listAuthUsers();

  assert.equal(got.length, 1500, 'both pages were read');
  assert.equal(total, 1500);
  assert.deepEqual(got[0].providers, ['google']);
  const text = JSON.stringify(got);
  assert.ok(!text.includes('bcrypt-hash') && !text.includes('token-should-not-appear'));
});

test('an empty project is not mistaken for a failure (total 0 means unknown, not "no users")', async () => {
  const { db } = adapter({ tables: { a: [] }, users: [] });
  assert.deepEqual(await db.listAuthUsers(), { users: [], total: null });
});

// ---------------------------------------------------------------------------
// The shipped configuration against the real table list
// ---------------------------------------------------------------------------

/** The 29 tables in the production `public` schema on 2026-11-06. */
const LIVE_TABLES_2026_11_06 = [
  'accounts', 'business_profiles', 'clients', 'company', 'customers', 'expenses', 'inventory', 'invoices',
  'keys', 'ledger_backups', 'otps', 'products', 'purchase_invoices', 'purchase_orders', 'rate_limits',
  'receipts', 'recurring_templates', 'sale_invoices', 'sales_orders', 'security_settings', 'skt_build',
  'skt_kv', 'skt_secret', 'stock', 'stock_movements', 'subscriptions', 'transactions', 'vendors', 'warehouses',
];

test('the shipped config classifies every table that exists in production, with no overlap', () => {
  const known = new Set([...Object.keys(INCLUDE), ...Object.keys(EXCLUDE)]);
  assert.deepEqual(LIVE_TABLES_2026_11_06.filter((t) => !known.has(t)), [], 'every live table is classified');
  assert.deepEqual(Object.keys(INCLUDE).filter((t) => t in EXCLUDE), [], 'no table is both included and excluded');
});

test('the credential tables are excluded and the data tables included, by name', () => {
  for (const t of ['keys', 'otps', 'security_settings', 'skt_secret', 'rate_limits']) assert.ok(t in EXCLUDE, `${t} excluded`);
  for (const t of ['transactions', 'accounts', 'skt_kv', 'business_profiles', 'subscriptions']) assert.ok(t in INCLUDE, `${t} included`);
  assert.deepEqual(INCLUDE.subscriptions.redact, ['licenseKey']);
});

test('end to end over HTTP with the real config: all data read, credential tables never touched', async () => {
  const tables = Object.fromEntries(LIVE_TABLES_2026_11_06.map((t) => [t, [] as Row[]]));
  tables.transactions = rows(1019);
  tables.skt_kv = Array.from({ length: 730 }, (_, i) => ({ k: `d|2026-10-08|prod|p${i}`, v: { n: i }, rev: i }));
  tables.subscriptions = [{ user_id: 'u1', plan: 'pro', licenseKey: 'LIC-SECRET' }];
  tables.keys = [{ key: 'KEY-SHOULD-NEVER-BE-READ' }];
  tables.otps = [{ identifier: 'x', otp: '123456' }];

  const { db, calls } = adapter({ tables, ddl: 'create table accounts();', cap: 1000 });
  const snap = await buildSnapshot(db, { project: 'abcd1234' });

  assert.equal(snap.tables.transactions.count, 1019);
  assert.equal(snap.tables.skt_kv.count, 730);
  assert.ok(!('licenseKey' in snap.tables.subscriptions.rows[0]));
  assert.ok(!JSON.stringify(snap).includes('KEY-SHOULD-NEVER-BE-READ'));
  for (const t of Object.keys(EXCLUDE)) {
    assert.ok(!calls.some((c) => c.path === `/rest/v1/${t}`), `${t} was never requested`);
  }
});

test('a table added to the database later stops the backup via the real adapter', async () => {
  const tables = Object.fromEntries(LIVE_TABLES_2026_11_06.map((t) => [t, [] as Row[]]));
  const withNew = { ...tables, loyalty_points: rows(3) };
  const { db } = adapter({ tables: withNew });
  await assert.rejects(buildSnapshot(db, { project: 'abcd1234' }), CoverageError);
});

// ---------------------------------------------------------------------------
// The restore write path, over HTTP
// ---------------------------------------------------------------------------

test('restore writes: insert-missing ignores duplicates, overwrite merges, and nothing is ever deleted', async () => {
  const { db, client, calls } = adapter({ tables: { transactions: rows(3) } });
  const live = createRestoreDb(client, db);

  await live.insertMissing('transactions', ['id'], [{ id: 'r1', n: 1 }]);
  await live.upsert('transactions', ['id'], [{ id: 'r2', n: 2 }]);

  const writes = calls.filter((c) => c.method === 'POST');
  assert.equal(writes.length, 2);
  assert.match(writes[0].prefer, /resolution=ignore-duplicates/, 'insert-missing must not overwrite existing rows');
  assert.match(writes[1].prefer, /resolution=merge-duplicates/);
  assert.ok(writes.every((w) => w.search.includes('on_conflict=id')), 'conflict target is the primary key');
  assert.deepEqual(JSON.parse(writes[0].body), [{ id: 'r1', n: 1 }]);
  assert.deepEqual(calls.filter((c) => !['GET', 'HEAD', 'POST'].includes(c.method)), [], 'no DELETE, PATCH or PUT');
});

test('a composite primary key is passed as the conflict target', async () => {
  const { db, client, calls } = adapter({ tables: { stock: [] } });
  await createRestoreDb(client, db).insertMissing('stock', ['user_id', 'product_id', 'warehouse_id'], [{ user_id: 'u' }]);
  const w = calls.find((c) => c.method === 'POST')!;
  assert.ok(decodeURIComponent(w.search).includes('on_conflict=user_id,product_id,warehouse_id'));
});

test('a whole restore through the real adapter sends only the missing rows, and only reads otherwise', async () => {
  // The backup was taken from a 10-row table; production has since lost 2 rows.
  const backupDb = adapter({ tables: { transactions: rows(10) } }).db;
  const snapshot = await buildSnapshot(backupDb, {
    project: 'old',
    include: { transactions: { primaryKey: ['id'] } },
    exclude: {},
  });

  const live = adapter({ tables: { transactions: rows(10).slice(2) } });
  const target = createRestoreDb(live.client, live.db);
  const diffs = await diffSnapshot(snapshot, target);
  assert.equal(diffs[0].missing.length, 2);

  const [report] = await applyDiff(diffs, target, { overwrite: false });
  assert.equal(report.inserted, 2);

  const writes = live.calls.filter((c) => c.method === 'POST');
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].body).map((r: Row) => r.id), ['r00000', 'r00001']);
  assert.match(writes[0].prefer, /ignore-duplicates/);
  assert.deepEqual(live.calls.filter((c) => !['GET', 'HEAD', 'POST'].includes(c.method)), []);
});
