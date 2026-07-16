import { NextResponse } from '../../../next-response.ts';
import { getMongoDb } from '../../../../src/lib/mongodb.ts';
import { verifyAppToken, verifyIdToken, extractToken } from '../../../../src/lib/auth-verify.ts';

// Ensure standard configuration
export const dynamic = 'force-dynamic';

const ALLOWED_COLLECTIONS = ['vendors', 'customers', 'products', 'warehouses', 'company'];

async function getAuthenticatedUserId(request: Request) {
  const token = extractToken(request);
  if (!token) return null;

  // Try custom HMAC token first
  const customUserId = verifyAppToken(token);
  if (customUserId) return customUserId;

  // Fallback to Firebase token
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
      return NextResponse.json({ error: 'Invalid master type' }, { status: 400 });
    }

    const db = await getMongoDb();
    
    // Fetch all docs for this user for the given type
    const collection = db.collection(type);
    const data = await collection.find({ userId }).toArray();
    
    // Remove mongodb _id to prevent client issues
    const sanitizedData = data.map(({ _id, ...rest }) => rest);

    return NextResponse.json({ data: sanitizedData });
  } catch (error: any) {
    console.error('API /erp/master GET Error:', error);
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
      return NextResponse.json({ error: 'Invalid master type' }, { status: 400 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(type);
    
    // Ensure userId is injected
    const payload = {
      ...data,
      userId,
      created_date: Date.now(),
      updated_date: Date.now()
    };

    await collection.insertOne(payload);

    return NextResponse.json({ success: true, message: 'Record created' });
  } catch (error: any) {
    console.error('API /erp/master POST Error:', error);
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
    
    const payload = {
      ...data,
      updated_date: Date.now()
    };
    
    // Remove un-updatable fields just in case
    delete payload._id;
    delete payload.userId;

    const query = { userId, [idField]: id };
    await collection.updateOne(query, { $set: payload });

    return NextResponse.json({ success: true, message: 'Record updated' });
  } catch (error: any) {
    console.error('API /erp/master PUT Error:', error);
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

    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error: any) {
    console.error('API /erp/master DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

