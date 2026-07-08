import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { verifyAppToken, verifyIdToken, extractToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const ALLOWED_COLLECTIONS = ['purchase_orders', 'purchase_invoices', 'sales_orders', 'sale_invoices'];

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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (!type || !ALLOWED_COLLECTIONS.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(type);
    
    // Fetch records and sort by creation date descending
    const data = await collection.find({ userId }).sort({ created_date: -1 }).toArray();
    const sanitizedData = data.map(({ _id, ...rest }) => rest);

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

    if (!type || !ALLOWED_COLLECTIONS.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }
    
    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = await getMongoDb();
    const collection = db.collection(type);
    
    const payload = {
      ...data,
      userId,
      created_date: Date.now(),
      created_by: userId
    };

    await collection.insertOne(payload);
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
    const { type, id, idField, data } = body;

    if (!type || !ALLOWED_COLLECTIONS.includes(type) || !id || !idField) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(type);
    
    const payload = { ...data, updated_date: Date.now() };
    delete payload._id;
    delete payload.userId;

    const query = { userId, [idField]: id };
    await collection.updateOne(query, { $set: payload });

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
    const { type, id, idField } = body;

    if (!type || !ALLOWED_COLLECTIONS.includes(type) || !id || !idField) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(type);
    
    const query = { userId, [idField]: id };
    await collection.deleteOne(query);

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('API /erp/transactions DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
