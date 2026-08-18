import { NextResponse } from '../../../next-response.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../utils/supabase-admin.ts';
import { verifyAppToken, verifyIdToken, extractToken } from '../../../../src/lib/auth-verify.ts';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(request: Request) {
  const token = extractToken(request);
  if (!token) return null;

  const customUserId = verifyAppToken(token);
  if (customUserId) return customUserId.uid;

  try {
    const decoded = await verifyIdToken(token);
    return decoded?.uid;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true, data: [] });
    }

    const supabase = getSupabaseAdmin();

    // Fetch records and sort by date descending
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    const sanitizedData = (data || []).map(({ user_id, ...rest }) => rest);

    return NextResponse.json({ data: sanitizedData });
  } catch (error: any) {
    console.error('API /erp/inventory GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { data } = body;

    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();

    // Create stock movement
    const movementPayload = {
      ...data,
      movement_id: `STK-${Date.now()}`,
      user_id: userId,
      created_date: Date.now()
    };

    const { error: movementError } = await supabase.from('stock_movements').insert(movementPayload);
    if (movementError) throw movementError;

    // Update the running stock summary. This runs through a Postgres function so
    // the read-modify-write of quantity_on_hand stays atomic under concurrency.
    const multiplier = data.movement_type === 'IN' ? 1 : -1;
    const qtyChange = Number(data.quantity) * multiplier;

    const { error: stockError } = await supabase.rpc('adjust_stock_on_hand', {
      p_user_id: userId,
      p_product_id: data.product_id,
      p_warehouse_id: data.warehouse_id,
      p_qty_change: qtyChange
    });

    if (stockError) throw stockError;

    return NextResponse.json({ success: true, message: 'Stock movement recorded' });
  } catch (error: any) {
    console.error('API /erp/inventory POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
