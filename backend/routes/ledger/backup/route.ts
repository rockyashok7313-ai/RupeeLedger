import { NextResponse } from '../../../next-response.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../utils/supabase-admin.ts';
import { verifyIdToken, extractToken, checkIsAdmin } from '../../../../src/lib/auth-verify.ts';
import { z } from 'zod';

const backupSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required.'),
  action: z.enum(['snapshot', 'list', 'restore']),
  /** Full ledger payload, for `snapshot`. */
  data: z.any().optional(),
  /** Which snapshot to read back, for `restore`. */
  backupId: z.number().int().positive().optional(),
});

/** How many days of history to keep per owner and branch. */
const KEEP_DAYS = 14;

/**
 * Callers fold the branch into the id ("<owner>_hq"), the same shape
 * /api/ledger/sync receives. Storage keys on (user_id, branchId).
 */
function splitBranch(userId: string): { ownerId: string; branchId: string } {
  const idx = userId.lastIndexOf('_');
  if (idx > 0) {
    return { ownerId: userId.substring(0, idx), branchId: userId.substring(idx + 1) };
  }
  return { ownerId: userId, branchId: 'hq' };
}

const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

/** Same ownership test the sync route applies, so backups cannot cross accounts. */
function isOwnerOf(
  decoded: { uid: string; email?: string; phone_number?: string },
  userId: string,
  baseUserId: string,
): boolean {
  if (decoded.uid === userId || decoded.uid === baseUserId) return true;

  const tokenEmail = decoded.email ? normalizeString(decoded.email) : '';
  const userEmail = baseUserId.startsWith('e_')
    ? normalizeString(baseUserId.substring(2))
    : normalizeString(baseUserId);
  if (tokenEmail && tokenEmail === userEmail) return true;

  const tokenPhone = decoded.phone_number ? normalizePhone(decoded.phone_number) : '';
  const userPhone = baseUserId.startsWith('p_')
    ? normalizePhone(baseUserId.substring(2))
    : normalizePhone(baseUserId);
  if (tokenPhone && tokenPhone === userPhone) return true;

  return false;
}

export async function POST(request: Request) {
  try {
    const parsed = backupSchema.safeParse(await request.json());
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const { userId, action, data, backupId } = parsed.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { ownerId, branchId } = splitBranch(userId);
    if (!checkIsAdmin(decoded) && !isOwnerOf(decoded, userId, ownerId)) {
      return NextResponse.json({ error: 'Forbidden: These backups belong to another account.' }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true, backups: [] });
    }

    const supabase = getSupabaseAdmin();

    // --- list -------------------------------------------------------------
    // Deliberately omits `payload`: the whole point of the list is to choose a
    // date, and shipping every snapshot's full ledger would be enormous.
    if (action === 'list') {
      const { data: rows, error } = await supabase
        .from('ledger_backups')
        .select('id, taken_on, created_at, account_count, transaction_count, byte_size')
        .eq('user_id', ownerId)
        .eq('branchId', branchId)
        .order('taken_on', { ascending: false })
        .limit(KEEP_DAYS);
      if (error) throw error;
      return NextResponse.json({ backups: rows || [] });
    }

    // --- restore ----------------------------------------------------------
    if (action === 'restore') {
      if (!backupId) {
        return NextResponse.json({ error: 'backupId is required to restore.' }, { status: 400 });
      }
      const { data: row, error } = await supabase
        .from('ledger_backups')
        .select('id, taken_on, payload, account_count, transaction_count')
        .eq('id', backupId)
        // Scoped to the caller, so a guessed id cannot read another ledger.
        .eq('user_id', ownerId)
        .eq('branchId', branchId)
        .maybeSingle();
      if (error) throw error;
      if (!row) {
        return NextResponse.json({ error: 'That backup was not found.' }, { status: 404 });
      }
      return NextResponse.json({ backup: row });
    }

    // --- snapshot ---------------------------------------------------------
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Nothing to back up.' }, { status: 400 });
    }

    const accountCount = Array.isArray(data.accounts) ? data.accounts.length : 0;
    const transactionCount = Array.isArray(data.transactions) ? data.transactions.length : 0;

    // An empty ledger is almost always a client that has not finished loading.
    // Writing it would spend the day's slot on nothing and, worse, offer an
    // empty snapshot as a restore point.
    if (accountCount === 0 && transactionCount === 0) {
      return NextResponse.json({ skipped: true, reason: 'Ledger is empty; nothing worth snapshotting.' });
    }

    const serialized = JSON.stringify(data);
    const takenOn = new Date().toISOString().slice(0, 10);

    const { data: saved, error } = await supabase
      .from('ledger_backups')
      .upsert(
        {
          user_id: ownerId,
          branchId,
          taken_on: takenOn,
          payload: data,
          account_count: accountCount,
          transaction_count: transactionCount,
          byte_size: serialized.length,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,branchId,taken_on' },
      )
      .select('id, taken_on, account_count, transaction_count, byte_size')
      .maybeSingle();
    if (error) throw error;

    // Trim history. A failure here is not worth failing the snapshot over.
    const { error: pruneError } = await supabase.rpc('prune_ledger_backups', {
      p_user_id: ownerId,
      p_branch_id: branchId,
      p_keep: KEEP_DAYS,
    });
    if (pruneError) console.error('[BACKUP] prune failed:', pruneError);

    return NextResponse.json({ backup: saved, keepDays: KEEP_DAYS });
  } catch (error) {
    console.error('Error in /api/ledger/backup:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
