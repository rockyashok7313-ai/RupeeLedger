/**
 * The real database behind the `Db` interface in snapshot.ts.
 *
 * Uses the Supabase service-role key, which bypasses Row Level Security so the
 * backup sees every tenant. That key must come from the environment (a CI
 * secret, or a local untracked .env file) and is never written anywhere by this
 * code. Nothing here logs request headers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MAX_CONSISTENCY_ATTEMPTS, PAGE_SIZE } from './config.ts';
import type { RestoreDb } from './restore-lib.ts';
import { readTable, type AuthUserRecord, type Db, type Row } from './snapshot.ts';

/** "https://abcd1234.supabase.co" -> "abcd1234". */
export function projectRefFromUrl(url: string): string {
  const host = new URL(url).hostname;
  return host.split('.')[0];
}

export interface SupabaseEnv {
  url: string;
  serviceKey: string;
}

/** Reads and validates the two environment variables, with errors that say what to do. */
export function readSupabaseEnv(env: NodeJS.ProcessEnv = process.env): SupabaseEnv {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) throw new Error('SUPABASE_URL is not set.');
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. The backup needs it to read every table; the public anon key ' +
        'would be blocked by Row Level Security and produce an empty backup.',
    );
  }
  return { url, serviceKey };
}

const PER_PAGE = 1000;

/**
 * Legacy keys are JWTs and belong in both headers. Newer "sb_secret_..." keys
 * are opaque, not JWTs, and are sent in `apikey` only; putting one in
 * Authorization: Bearer is rejected as an invalid JWT.
 */
export function authHeaders(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}`, ...extra } : { apikey: key, ...extra };
}

/**
 * Table names from PostgREST's OpenAPI document. Swagger 2.0 lists tables and
 * views under `definitions`; `paths` is the fallback. RPC endpoints are not tables.
 */
export function parseTableNames(spec: { definitions?: Record<string, unknown>; paths?: Record<string, unknown> }): string[] {
  const names = spec.definitions
    ? Object.keys(spec.definitions)
    : Object.keys(spec.paths ?? {})
        .filter((p) => p !== '/' && !p.startsWith('/rpc/'))
        .map((p) => p.slice(1));
  if (names.length === 0) throw new Error('The database reported no tables; refusing to treat that as a valid listing.');
  return names;
}

/** `fetchImpl` is injectable so the adapter can be tested against a fake server. */
export function createSupabaseDb(
  env: SupabaseEnv,
  fetchImpl: typeof fetch = fetch,
): { db: Db; client: SupabaseClient; project: string } {
  const client = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl },
  });

  const db: Db = {
    async listTables() {
      // PostgREST publishes its schema at the API root; only the service-role key may read it.
      const res = await fetchImpl(`${env.url.replace(/\/$/, '')}/rest/v1/`, {
        headers: authHeaders(env.serviceKey, { Accept: 'application/openapi+json' }),
      });
      if (!res.ok) throw new Error(`Could not list tables (HTTP ${res.status}). Is the service-role key correct?`);
      return parseTableNames((await res.json()) as Parameters<typeof parseTableNames>[0]);
    },

    async count(table) {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) throw new Error(`Counting "${table}" failed: ${error.message}`);
      if (count === null) throw new Error(`Counting "${table}" returned no count.`);
      return count;
    },

    async page(table, from, to, orderBy) {
      let q = client.from(table).select('*');
      for (const col of orderBy) q = q.order(col, { ascending: true });
      const { data, error } = await q.range(from, to);
      if (error) throw new Error(`Reading "${table}" failed: ${error.message}`);
      return (data ?? []) as Row[];
    },

    async listAuthUsers() {
      const users: AuthUserRecord[] = [];
      let total: number | null = null;
      for (let page = 1; page < 1000; page++) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: PER_PAGE });
        if (error) throw new Error(`Listing users failed: ${error.message}`);
        const batch = data.users ?? [];
        // auth-js reports total: 0 whenever the response carries no Link header, so 0
        // means "unknown", not "no users". Only a positive total is worth enforcing.
        const t = (data as { total?: number }).total;
        if (typeof t === 'number' && t > 0) total = t;
        for (const u of batch) {
          const providers = new Set<string>();
          for (const i of u.identities ?? []) if (i.provider) providers.add(i.provider);
          users.push({
            id: u.id,
            email: u.email ?? null,
            phone: u.phone ?? null,
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
            email_confirmed_at: u.email_confirmed_at ?? null,
            phone_confirmed_at: u.phone_confirmed_at ?? null,
            app_metadata: u.app_metadata ?? {},
            user_metadata: u.user_metadata ?? {},
            providers: [...providers].sort(),
          });
        }
        if (batch.length < PER_PAGE) break;
      }
      users.sort((a, b) => a.id.localeCompare(b.id));
      return { users, total };
    },

    async schemaDdl() {
      const { data, error } = await client.rpc('backup_schema_ddl');
      if (error) {
        // PGRST202 / 42883: the function has not been installed (migration 0004).
        // That is reported as a warning by the caller. Anything else is a real failure.
        if (error.code === 'PGRST202' || error.code === '42883') return null;
        throw new Error(`Capturing the schema failed: ${error.message}`);
      }
      if (typeof data !== 'string' || data.length === 0) {
        throw new Error('backup_schema_ddl returned nothing; refusing to record an empty schema.');
      }
      return data;
    },
  };

  return { db, client, project: projectRefFromUrl(env.url) };
}

/** Writes for restore. Reads reuse the export's verified paging. */
export function createRestoreDb(client: SupabaseClient, db: Db): RestoreDb {
  const write = async (table: string, pk: string[], rows: Row[], ignoreDuplicates: boolean) => {
    if (rows.length === 0) return;
    const { error } = await client.from(table).upsert(rows, { onConflict: pk.join(','), ignoreDuplicates });
    if (error) throw new Error(`Writing to "${table}" failed: ${error.message}`);
  };
  return {
    readAll: (table, pk) => readTable(db, table, pk, PAGE_SIZE, MAX_CONSISTENCY_ATTEMPTS),
    insertMissing: (table, pk, rows) => write(table, pk, rows, true),
    upsert: (table, pk, rows) => write(table, pk, rows, false),
  };
}
