import type { SupabaseClient } from '@supabase/supabase-js';

/** Read every row; the database may cap each response below the requested size. */
export async function readLedgerRows(db: SupabaseClient, table: string, owner: string, branch: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let expected: number | undefined;
  while (true) {
    const { data, error, count } = await db.from(table).select('*', { count: 'exact' })
      .eq('user_id', owner).eq('branchId', branch).order('id').range(rows.length, rows.length + 499);
    if (error || count === null || !Array.isArray(data)) throw new Error(`Could not load all ${table} records. Device records were kept.`);
    if (expected === undefined) expected = count;
    if (count !== expected) throw new Error(`${table} changed during loading. Retry to get a complete copy.`);
    if (!data.length && rows.length !== expected) throw new Error(`Incomplete ${table} response. Device records were kept.`);
    rows.push(...data);
    if (rows.length === expected) return rows;
    if (rows.length > expected) throw new Error(`Inconsistent ${table} response. Retry loading.`);
  }
}
