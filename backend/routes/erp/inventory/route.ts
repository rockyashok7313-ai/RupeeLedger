import { NextResponse } from '../../../next-response';
import { getMongoDb } from '../../../../src/lib/mongodb';
import { verifyAppToken, verifyIdToken, extractToken } from '../../../../src/lib/auth-verify';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(request: Request) {
  const token = extractToken(request);
  if (!token) return null;

  const customUserId = verifyAppToken(token);
  if (customUserId) return customUserId;

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

    const db = await getMongoDb();
    const collection = db.collection('stock_movements');
    
    // Fetch records and sort by date descending
    const data = await collection.find({ userId }).sort({ date: -1 }).toArray();
    const sanitizedData = data.map(({ _id, ...rest }) => rest);

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

    const db = await getMongoDb();
    
    // Create stock movement
    const movementPayload = {
      ...data,
      movement_id: `STK-${Date.now()}`,
      userId,
      created_date: Date.now()
    };

    await db.collection('stock_movements').insertOne(movementPayload);

    // Update actual stock summary in 'stock' collection
    const stockColl = db.collection('stock');
    const multiplier = data.movement_type === 'IN' ? 1 : -1;
    const qtyChange = data.quantity * multiplier;

    await stockColl.updateOne(
      { userId, product_id: data.product_id, warehouse_id: data.warehouse_id },
      { 
        $inc: { quantity_on_hand: qtyChange },
        $set: { updated_date: Date.now() }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'Stock movement recorded' });
  } catch (error: any) {
    console.error('API /erp/inventory POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
