import { NextResponse } from '../../../next-response.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../utils/supabase-admin.ts';
import { verifyIdToken, extractToken, checkIsAdmin } from '../../../../src/lib/auth-verify.ts';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

const syncSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required.'),
  action: z.enum(['pull', 'push']),
  accounts: z.array(z.any()).optional(),
  transactions: z.array(z.any()).optional(),
  businessProfile: z.any().optional(),
  subscription: z.any().optional(),
  securitySettings: z.any().optional(),
  clients: z.array(z.any()).optional(),
  inventory: z.array(z.any()).optional(),
  invoices: z.array(z.any()).optional(),
  expenses: z.array(z.any()).optional(),
  recurringTemplates: z.array(z.any()).optional(),
  receipts: z.array(z.any()).optional(),
});

/** Logical collection name -> Supabase table name. */
const TABLES = {
  accounts: 'accounts',
  transactions: 'transactions',
  clients: 'clients',
  inventory: 'inventory',
  invoices: 'invoices',
  expenses: 'expenses',
  recurringTemplates: 'recurring_templates',
  receipts: 'receipts',
} as const;

/** Strip the storage columns so the client sees the same shape it pushed. */
const mapRows = (rows: any[] | null) =>
  (rows || []).map(({ user_id, branchId, ...rest }) => rest);

/** Strip server-managed columns from a single settings row. */
const mapSettings = (row: any | null) =>
  row ? (({ user_id, updated_at, ...rest }) => rest)(row) : null;

/**
 * Callers pass the branch folded into the id ("<owner>_hq"). Storage keys on
 * (user_id, branchId) instead, which is the shape src/lib/supabaseSync.ts reads
 * and writes -- both paths target the same rows, so they must agree.
 */
function splitBranch(userId: string): { ownerId: string; branchId: string } {
  const idx = userId.lastIndexOf('_');
  if (idx > 0) {
    return { ownerId: userId.substring(0, idx), branchId: userId.substring(idx + 1) };
  }
  return { ownerId: userId, branchId: 'hq' };
}

/**
 * Replace the stored set for a table with `dataArray`: delete rows the client no
 * longer has, then upsert the rest. The pushed array is the source of truth
 * for that owner and branch.
 */
async function syncArray(
  supabase: SupabaseClient,
  table: string,
  dataArray: any[] | undefined,
  ownerId: string,
  branchId: string
) {
  if (!dataArray || !Array.isArray(dataArray)) return;

  const activeIds = dataArray.map(item => item.id).filter(id => id !== undefined && id !== null);

  if (activeIds.length === 0) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', ownerId)
      .eq('branchId', branchId);
    if (error) throw error;
    return;
  }

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', ownerId)
    .eq('branchId', branchId);
  if (selectError) throw selectError;

  const idsToDelete = (existing || []).map(r => r.id).filter(id => !activeIds.includes(id));
  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', ownerId)
      .eq('branchId', branchId)
      .in('id', idsToDelete);
    if (error) throw error;
  }

  // `branchId` is set after the spread so a stale value carried in from a
  // previous pull cannot override the branch being written.
  const rows = dataArray.map(item => ({ ...item, user_id: ownerId, branchId }));
  const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (upsertError) throw upsertError;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // Zod Schema Validation
    const parsed = syncSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      userId,
      accounts,
      transactions,
      businessProfile,
      subscription,
      securitySettings,
      clients,
      inventory,
      invoices,
      expenses,
      recurringTemplates,
      receipts,
      action
    } = parsed.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Verify that the token owner is the one requested (or it's the admin, or phone matches)
    const baseUserId = userId.includes('_') ? userId.substring(0, userId.lastIndexOf('_')) : userId;
    const isOwner = decodedToken.uid === userId || decodedToken.uid === baseUserId;

    const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

    const tokenEmail = decodedToken.email ? normalizeString(decodedToken.email) : '';
    const userEmail = baseUserId.startsWith('e_') ? normalizeString(baseUserId.substring(2)) : normalizeString(baseUserId);
    const isEmailUser = tokenEmail && tokenEmail === userEmail;

    const tokenPhone = decodedToken.phone_number ? normalizePhone(decodedToken.phone_number) : '';
    const userPhone = baseUserId.startsWith('p_') ? normalizePhone(baseUserId.substring(2)) : normalizePhone(baseUserId);
    const isPhoneUser = tokenPhone && tokenPhone === userPhone;

    const isAdmin = checkIsAdmin(decodedToken);

    if (!isOwner && !isPhoneUser && !isEmailUser && !isAdmin) {
      console.error(`Unauthorized sync attempt. Token uid: ${decodedToken.uid}, Target: ${userId}`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access this data.' }, { status: 403 });
    }

    // Fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      console.log('[SYNC] Supabase is not configured. Falling back to local offline mode.');
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();

    // Storage is keyed on (user_id, branchId), matching src/lib/supabaseSync.ts.
    const { ownerId, branchId } = splitBranch(userId);

    if (action === 'pull') {
      const [
        profileRes,
        subscriptionRes,
        securityRes,
        accountsRes,
        transactionsRes,
        clientsRes,
        inventoryRes,
        invoicesRes,
        expensesRes,
        recurringRes,
        receiptsRes
      ] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('user_id', ownerId).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', ownerId).maybeSingle(),
        supabase.from('security_settings').select('*').eq('user_id', ownerId).maybeSingle(),
        supabase.from(TABLES.accounts).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.transactions).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.clients).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.inventory).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.invoices).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.expenses).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.recurringTemplates).select('*').eq('user_id', ownerId).eq('branchId', branchId),
        supabase.from(TABLES.receipts).select('*').eq('user_id', ownerId).eq('branchId', branchId),
      ]);

      const profile = profileRes.data;

      return NextResponse.json({
        clients: mapRows(clientsRes.data),
        inventory: mapRows(inventoryRes.data),
        invoices: mapRows(invoicesRes.data),
        expenses: mapRows(expensesRes.data),
        recurringTemplates: mapRows(recurringRes.data),
        receipts: mapRows(receiptsRes.data),
        exists: !!profile,
        businessProfile: mapSettings(profile),
        subscription: mapSettings(subscriptionRes.data),
        securitySettings: mapSettings(securityRes.data),
        accounts: mapRows(accountsRes.data),
        transactions: mapRows(transactionsRes.data)
      });
    }

    if (action === 'push') {
      // 1. Save the user's settings rows
      const updatedAt = new Date().toISOString();

      // Settings are per owner, not per branch.
      if (businessProfile) {
        const { error } = await supabase
          .from('business_profiles')
          .upsert({ user_id: ownerId, ...businessProfile, updated_at: updatedAt }, { onConflict: 'user_id' });
        if (error) throw error;
      }

      if (subscription) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({ user_id: ownerId, ...subscription, updated_at: updatedAt }, { onConflict: 'user_id' });
        if (error) throw error;
      }

      if (securitySettings) {
        const { error } = await supabase
          .from('security_settings')
          .upsert({ user_id: ownerId, ...securitySettings, updated_at: updatedAt }, { onConflict: 'user_id' });
        if (error) throw error;
      }

      // 2. Replace the stored collections with what the client pushed
      await syncArray(supabase, TABLES.accounts, accounts, ownerId, branchId);
      await syncArray(supabase, TABLES.transactions, transactions, ownerId, branchId);
      await syncArray(supabase, TABLES.clients, clients, ownerId, branchId);
      await syncArray(supabase, TABLES.inventory, inventory, ownerId, branchId);
      await syncArray(supabase, TABLES.invoices, invoices, ownerId, branchId);
      await syncArray(supabase, TABLES.expenses, expenses, ownerId, branchId);
      await syncArray(supabase, TABLES.recurringTemplates, recurringTemplates, ownerId, branchId);
      await syncArray(supabase, TABLES.receipts, receipts, ownerId, branchId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/ledger/sync:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
