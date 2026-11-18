import type { SupabaseClient } from '@supabase/supabase-js';
import { readLedgerRows } from './read-ledger-rows.ts';
import { stripCredentials } from './backup-payload.ts';

const TABLES = { accounts: 'accounts', transactions: 'transactions', clients: 'clients', inventory: 'inventory', invoices: 'invoices', expenses: 'expenses', recurringTemplates: 'recurring_templates', receipts: 'receipts' } as const;

/** Include every scoped cloud record plus unsynced device records. No live row is written. */
export async function completeBackup(db: SupabaseClient, owner: string, branch: string, payload: Record<string, unknown>) {
  const clean = stripCredentials(payload);
  const entries = await Promise.all(Object.entries(TABLES).map(async ([key, table]) => {
    const cloud = await readLedgerRows(db, table, owner, branch);
    const combined = new Map<string, Record<string, unknown>>();
    for (const row of cloud) {
      const { user_id, branchId, ...record } = row;
      combined.set(String(record.id), record);
    }
    const device = clean[key];
    if (device !== undefined && !Array.isArray(device)) throw new Error(`Invalid ${key} in backup. Your records are unchanged.`);
    for (const row of (device || []) as Record<string, unknown>[]) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string') throw new Error(`Invalid ${key} record in backup.`);
      const { user_id, branchId, ...record } = row;
      combined.set(String(record.id), record);
    }
    return [key, [...combined.values()]];
  }));
  return { ...clean, ...Object.fromEntries(entries) };
}
