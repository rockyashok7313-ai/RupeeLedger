import { NextResponse } from '../../../next-response.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../utils/supabase-admin.ts';
import { verifyAppToken, verifyIdToken, extractToken } from '../../../../src/lib/auth-verify.ts';

export const dynamic = 'force-dynamic';

const ALLOWED_TABLES = ['purchase_orders', 'purchase_invoices', 'sales_orders', 'sale_invoices'];

/**
 * The identifying column for each table. Derived here rather than taken from the
 * request: an attacker-supplied `idField` of `user_id` would match every row the
 * caller owns, turning a single-record update or delete into a bulk one.
 */
const ID_FIELDS: Record<string, string> = {
  purchase_orders: 'po_id',
  purchase_invoices: 'purchase_inv_id',
  sales_orders: 'so_id',
  sale_invoices: 'sale_inv_id'
};

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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !ALLOWED_TABLES.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true, data: [] });
    }

    const supabase = getSupabaseAdmin();

    // Fetch records and sort by creation date descending
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .eq('user_id', userId)
      .order('created_date', { ascending: false });

    if (error) throw error;

    const sanitizedData = (data || []).map(({ user_id, ...rest }) => rest);

    return NextResponse.json({ data: sanitizedData });
  } catch (error: any) {
    console.error('API /erp/transactions GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, data } = body;

    if (!type || !ALLOWED_TABLES.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();

    const payload = {
      ...data,
      user_id: userId,
      created_date: Date.now(),
      created_by: userId
    };

    const { error } = await supabase.from(type).insert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Transaction created' });
  } catch (error: any) {
    console.error('API /erp/transactions POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, id, data } = body;

    if (!type || !ALLOWED_TABLES.includes(type) || !id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const idField = ID_FIELDS[type];

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();

    const payload: Record<string, unknown> = { ...data, updated_date: Date.now() };
    delete payload.id;
    delete payload.user_id;

    // `type` and `idField` are dynamic (validated above), so the query builder is
    // untyped here -- Supabase cannot infer a schema from a runtime table name.
    const { error } = await (supabase.from(type) as any)
      .update(payload)
      .eq('user_id', userId)
      .eq(idField, id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Transaction updated' });
  } catch (error: any) {
    console.error('API /erp/transactions PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, id } = body;

    if (!type || !ALLOWED_TABLES.includes(type) || !id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const idField = ID_FIELDS[type];

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await (supabase.from(type) as any)
      .delete()
      .eq('user_id', userId)
      .eq(idField, id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('API /erp/transactions DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
