/**
 * Proves public.backup_schema_ddl() (migration 0004) captures a schema well
 * enough to rebuild it.
 *
 * Method, using PGlite (real PostgreSQL compiled to WASM, in-process, no server
 * and no connection to any real project):
 *
 *   1. Build a fixture database that exercises everything the function claims
 *      to capture, then install the migration.
 *   2. Ask it for its DDL.
 *   3. Rebuild a second, EMPTY database from nothing but that DDL.
 *   4. Compare the two catalogs object by object.
 *
 * The strongest check is the last one: DDL generated from the REBUILT database
 * must equal DDL generated from the original. If the function silently dropped
 * or mangled anything, the rebuild would differ and the second generation would
 * not match.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION = readFileSync(new URL('../../supabase/migrations/0004_backup_schema_function.sql', import.meta.url), 'utf8');

/**
 * Roles that exist on every Supabase project, plus the default privileges that
 * make Supabase different from plain Postgres: new tables and functions in
 * public are GRANTED to the API roles automatically. That is why explicit
 * revokes matter, and without modelling it here a missing revoke would be
 * invisible to this test.
 */
const ROLES = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const FIXTURE = `
  create sequence public.ticket_seq start 100 increment 5;

  create table public.accounts (
    id text primary key,
    user_id text not null,
    name text not null default '',
    "initialBalance" numeric(14,2) not null default 0,
    meta jsonb not null default '{}'::jsonb,
    "createdAt" bigint,
    constraint accounts_balance_nonneg check ("initialBalance" >= 0)
  );

  create table public.transactions (
    id text primary key,
    user_id text not null,
    "accountId" text not null,
    amount numeric not null,
    note text,
    seq bigint default nextval('public.ticket_seq'),
    total numeric generated always as (amount * 2) stored,
    taken_on date not null default current_date,
    created timestamptz not null default now(),
    unique (user_id, taken_on, id)
  );

  create table public.ledger_backups (
    id bigserial primary key,
    user_id text not null,
    payload jsonb not null,
    unique (user_id)
  );

  create table public.lines (
    id bigint generated always as identity primary key,
    tx_id text references public.transactions(id) on delete cascade,
    qty int not null default 1
  );

  create index tx_account_idx on public.transactions ("accountId", created desc);
  create unique index tx_note_uniq on public.transactions (lower(note)) where note is not null;

  alter table public.accounts enable row level security;
  alter table public.transactions enable row level security;
  alter table public.transactions force row level security;

  create policy "own rows" on public.accounts for select to authenticated
    using (user_id = current_setting('app.uid', true));
  create policy "service all" on public.accounts as permissive for all to service_role
    using (true) with check (true);
  create policy "never anon" on public.transactions as restrictive for select to public
    using (false);

  create function public.touch() returns trigger language plpgsql as $$
    begin new.created := now(); return new; end $$;
  create trigger tx_touch before insert on public.transactions
    for each row execute function public.touch();

  create function public.secure_add(a int, b int) returns int
    language sql security definer set search_path = public as $$ select a + b $$;
  revoke all on function public.secure_add(int, int) from public;
  grant execute on function public.secure_add(int, int) to service_role;

  revoke all on table public.ledger_backups from anon;
  revoke insert, update, delete, truncate, references, trigger on table public.accounts from anon;
`;

/** A flat, sorted description of everything the function is supposed to preserve. */
const FINGERPRINT = `
  select line from (
    select 'col ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
           || ' nn=' || a.attnotnull || ' id=' || a.attidentity::text || ' gen=' || a.attgenerated::text
           || ' def=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '') as line
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    union all
    select 'con ' || c.relname || '.' || con.conname || ' ' || pg_get_constraintdef(con.oid)
      from pg_constraint con join pg_class c on c.oid = con.conrelid
     where c.relnamespace = 'public'::regnamespace and con.contype in ('p','u','c','f')
    union all
    select 'idx ' || pg_get_indexdef(i.indexrelid)
      from pg_index i join pg_class c on c.oid = i.indrelid
     where c.relnamespace = 'public'::regnamespace
    union all
    select 'rls ' || relname || ' ' || relrowsecurity || ' ' || relforcerowsecurity
      from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
    union all
    select 'pol ' || tablename || '.' || policyname || ' ' || permissive || ' ' || cmd || ' ' || roles::text
           || ' ' || coalesce(qual, '') || ' | ' || coalesce(with_check, '')
      from pg_policies where schemaname = 'public'
    union all
    select 'fn ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid))
      from pg_proc p where p.pronamespace = 'public'::regnamespace
    union all
    select 'trg ' || pg_get_triggerdef(t.oid)
      from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
    union all
    select 'seq ' || c.relname || ' ' || s.seqstart || ' ' || s.seqincrement || ' ' || s.seqtypid::regtype::text
      from pg_class c join pg_sequence s on s.seqrelid = c.oid
     where c.relnamespace = 'public'::regnamespace
    union all
    select 'tblpriv ' || c.relname || ' ' || coalesce((select rolname from pg_roles where oid = a.grantee), 'public')
           || ' ' || a.privilege_type
      from pg_class c, aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and coalesce((select rolname from pg_roles where oid = a.grantee), 'public') in ('public','anon','authenticated','service_role')
    union all
    select 'fnpriv ' || p.oid::regprocedure::text || ' ' || coalesce((select rolname from pg_roles where oid = a.grantee), 'public')
      from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where p.pronamespace = 'public'::regnamespace and a.privilege_type = 'EXECUTE'
       and coalesce((select rolname from pg_roles where oid = a.grantee), 'public') in ('public','anon','authenticated','service_role')
  ) x order by line
`;

const fingerprint = async (db: PGlite) => (await db.query<{ line: string }>(FINGERPRINT)).rows.map((r) => r.line);
const ddlOf = async (db: PGlite) =>
  (await db.query<{ ddl: string }>('select public.backup_schema_ddl() as ddl')).rows[0].ddl;
/** The header carries a timestamp; everything after it must be stable. */
const body = (ddl: string) => ddl.split('\n').slice(1).join('\n');

async function original() {
  const db = new PGlite();
  await db.exec(ROLES);
  await db.exec(FIXTURE);
  await db.exec(MIGRATION);
  return db;
}

test('the rebuilt database matches the original, object by object', async () => {
  const a = await original();
  const ddl = await ddlOf(a);

  const b = new PGlite();
  await b.exec(ROLES);
  await b.exec(ddl); // must run cleanly on an empty database

  const fa = await fingerprint(a);
  const fb = await fingerprint(b);
  // Guard against comparing two empty or near-empty descriptions: every kind of
  // object the function claims to capture must actually be present in the fixture.
  for (const kind of ['col', 'con', 'idx', 'rls', 'pol', 'fn', 'trg', 'seq', 'tblpriv', 'fnpriv']) {
    assert.ok(fa.some((l) => l.startsWith(`${kind} `)), `fixture exercises "${kind}"`);
  }
  assert.deepEqual(fb.filter((l) => !fa.includes(l)), [], 'nothing extra in the rebuild');
  assert.deepEqual(fa.filter((l) => !fb.includes(l)), [], 'nothing missing from the rebuild');
  await a.close();
  await b.close();
});

test('DDL generated from the rebuilt database equals the original DDL (fixed point)', async () => {
  const a = await original();
  const ddl1 = await ddlOf(a);
  const b = new PGlite();
  await b.exec(ROLES);
  await b.exec(ddl1);
  assert.equal(body(await ddlOf(b)), body(ddl1));
  await a.close();
  await b.close();
});

test('the script is idempotent: running it again changes nothing and does not error', async () => {
  const a = await original();
  const ddl = await ddlOf(a);
  const b = new PGlite();
  await b.exec(ROLES);
  await b.exec(ddl);
  const before = await fingerprint(b);
  await b.exec(ddl); // second run on a database that already has everything
  assert.deepEqual(await fingerprint(b), before);
  await a.close();
  await b.close();
});

test('it restores onto a database that already has SOME of the tables', async () => {
  const a = await original();
  const ddl = await ddlOf(a);
  const partial = new PGlite();
  await partial.exec(ROLES);
  await partial.exec('create table public.accounts (id text primary key, user_id text not null, name text not null default \'\', "initialBalance" numeric(14,2) not null default 0, meta jsonb not null default \'{}\', "createdAt" bigint, constraint accounts_balance_nonneg check ("initialBalance" >= 0));');
  await partial.exec(ddl);
  assert.deepEqual(await fingerprint(partial), await fingerprint(a));
  await a.close();
  await partial.close();
});

test('constraints, defaults and generated columns still behave in the rebuilt database', async () => {
  const a = await original();
  const b = new PGlite();
  await b.exec(ROLES);
  await b.exec(await ddlOf(a));

  await assert.rejects(
    b.exec(`insert into public.accounts (id, user_id, "initialBalance") values ('x', 'u', -5)`),
    /accounts_balance_nonneg/,
    'check constraint survived',
  );
  await b.exec(`insert into public.transactions (id, user_id, "accountId", amount) values ('t1', 'u', 'a', 21)`);
  const t = (await b.query<{ total: string; seq: string }>(`select total, seq from public.transactions where id = 't1'`)).rows[0];
  assert.equal(Number(t.total), 42, 'generated column computes');
  assert.equal(Number(t.seq), 100, 'sequence default and start value survived');

  await b.exec(`insert into public.lines (tx_id) values ('t1')`);
  await b.exec(`delete from public.transactions where id = 't1'`);
  assert.equal((await b.query(`select 1 from public.lines`)).rows.length, 0, 'foreign key cascade survived');
  await a.close();
  await b.close();
});

test('row level security and API-role privileges are reproduced, including revokes', async () => {
  const a = await original();
  const b = new PGlite();
  await b.exec(ROLES);
  await b.exec(await ddlOf(a));

  const rls = (await b.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `select relname, relrowsecurity, relforcerowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
  )).rows;
  assert.deepEqual(
    rls.filter((r) => r.relrowsecurity).map((r) => `${r.relname}:${r.relforcerowsecurity}`),
    ['accounts:false', 'transactions:true'],
  );

  // The explicit revoke on ledger_backups must be reproduced, not silently re-opened.
  const priv = (role: string, table: string, p: string) =>
    b.query<{ ok: boolean }>(`select has_table_privilege('${role}', 'public.${table}', '${p}') as ok`).then((r) => r.rows[0].ok);
  assert.equal(await priv('anon', 'ledger_backups', 'select'), false);
  assert.equal(await priv('anon', 'accounts', 'select'), true);
  assert.equal(await priv('anon', 'accounts', 'insert'), false);
  await a.close();
  await b.close();
});

test('only service_role may call the schema function', async () => {
  const a = await original();
  const can = async (role: string) =>
    (await a.query<{ ok: boolean }>(`select has_function_privilege('${role}', 'public.backup_schema_ddl()', 'execute') as ok`)).rows[0].ok;
  assert.equal(await can('service_role'), true);
  assert.equal(await can('anon'), false);
  assert.equal(await can('authenticated'), false);
  await a.close();
});

test('the script contains structure only: no row data, however sensitive the table', async () => {
  const a = await original();
  await a.exec(`insert into public.accounts (id, user_id, name) values ('acct1', 'u1', 'DISTINCTIVE-BUSINESS-NAME')`);
  const ddl = await ddlOf(a);
  assert.ok(!ddl.includes('DISTINCTIVE-BUSINESS-NAME') && !/\binsert into\b/i.test(ddl));
  assert.match(ddl, /create table if not exists public\.accounts/);
  assert.match(ddl, /create policy "own rows" on public\.accounts/);
  await a.close();
});
