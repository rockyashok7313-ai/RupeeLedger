import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export const expenseRecordSchema = z.object({
  id: z.string().min(1).max(200), vendorName: z.string().trim().min(1).max(200),
  vendorId: z.string().optional(), gstin: z.string().max(15), category: z.string().max(100),
  date: z.number().finite().min(0).max(8640000000000000), createdAt: z.number().finite(),
  amount: z.number().finite().nonnegative().max(999999999999),
  cgst: z.number().finite().nonnegative(), sgst: z.number().finite().nonnegative(), igst: z.number().finite().nonnegative(),
});
export type ExpenseRecord = z.infer<typeof expenseRecordSchema>;
const compareFields = ['vendorName', 'gstin', 'category', 'date', 'amount', 'cgst', 'sgst', 'igst', 'createdAt'] as const;
export class ExpenseConflict extends Error {}

/** Single-record writes, never replacement of a user's entire expense set. */
export async function mutateExpense(db: SupabaseClient, owner: string, branch: string, action: 'expense-save' | 'expense-delete', expense: ExpenseRecord, original?: ExpenseRecord) {
  if (original && original.id !== expense.id) throw new ExpenseConflict('The expense identifier changed. Reload before saving.');
  const scope = () => db.from('expenses').select('*').eq('user_id', owner).eq('branchId', branch).eq('id', expense.id);
  const { data: existing, error: readError } = await scope().maybeSingle();
  if (readError) throw new Error('Could not read the cloud expense. Please retry.');
  // A repeated request after a dropped response is safe and idempotent.
  if (action === 'expense-delete' && !existing) return;
  const unchanged = existing && compareFields.every(key => existing[key] === expense[key]) && (existing.vendorId || '') === (expense.vendorId || '');
  if (action === 'expense-save' && unchanged) return;
  if (!existing) {
    if (original) throw new ExpenseConflict('This expense is no longer in the cloud. Reload and review before saving.');
    const { error } = await db.from('expenses').insert({ ...expense, user_id: owner, branchId: branch });
    if (error) throw new Error('Could not create the cloud expense. Your draft is retained; retry when connected.');
    return;
  }
  if (!original) throw new ExpenseConflict('An expense already uses this identifier. Reload before saving.');
  // Compare the original values in the write itself, so another device's edit
  // between the read and write cannot be overwritten silently.
  let query = action === 'expense-delete' ? db.from('expenses').delete() : db.from('expenses').update(expense);
  query = query.eq('user_id', owner).eq('branchId', branch).eq('id', expense.id);
  for (const key of compareFields) query = query.eq(key, original[key]);
  if (original.vendorId) query = query.eq('vendorId', original.vendorId);
  const { data, error } = await query.select('id');
  if (error) throw new Error('Could not save the cloud expense. Your draft is retained; please retry.');
  if (!data?.length) throw new ExpenseConflict('This expense changed on another device. Reload and review the latest record before editing.');
}
