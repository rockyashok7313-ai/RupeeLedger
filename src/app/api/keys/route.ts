import { NextResponse } from 'next/server';
import { getMongoDb, isMongoConfigured } from '@/lib/mongodb';
import { verifyIdToken, extractToken } from '@/lib/auth-verify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter.' }, { status: 400 });
    }

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // Only allow admin or the user themselves to query their keys
    const isAdmin = decodedToken.email === 'rockyashok7313@gmail.com';
    const isOwner = decodedToken.uid === userId || (decodedToken.email && userId === `e_${decodedToken.email}`) || (decodedToken.phone_number && userId === `p_${decodedToken.phone_number}`);
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access these keys.' }, { status: 403 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json({ isOfflineFallback: true, keys: [] });
    }

    const db = await getMongoDb();
    const keysCollection = db.collection('keys');

    const keys = await keysCollection.find({ createdBy: userId }).toArray();
    const mappedKeys = keys.map(k => ({
      key: k.key || k._id.toString(),
      duration: k.durationDays === 365 ? 'Annual' : 'Monthly',
      createdAt: k.createdAt || Date.now(),
      status: k.status || 'unused'
    })).sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ keys: mappedKeys });
  } catch (error) {
    console.error('Error fetching keys from MongoDB:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, durationDays, createdBy } = body;

    if (!key || !createdBy) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // Only allow admin to generate new keys
    const isAdmin = decodedToken.email === 'rockyashok7313@gmail.com';
    if (!isAdmin) {
      console.warn(`Unauthorized key generation attempt by ${decodedToken.uid}`);
      return NextResponse.json({ error: 'Forbidden: Only administrators can generate keys.' }, { status: 403 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const db = await getMongoDb();
    const keysCollection = db.collection('keys');

    await keysCollection.updateOne(
      { key: key },
      {
        $set: {
          durationDays: durationDays || 30,
          status: 'unused',
          createdAt: Date.now(),
          createdBy
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating key in MongoDB:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, userId } = body;

    if (!key || !userId) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const db = await getMongoDb();
    const keysCollection = db.collection('keys');

    const keyDoc = await keysCollection.findOne({ 
      $or: [{ key: key }, { _id: key as any }] 
    });
    if (!keyDoc) {
      return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
    }

    if (keyDoc.status === 'used') {
      return NextResponse.json({ error: 'Key already used.' }, { status: 400 });
    }

    await keysCollection.updateOne(
      { $or: [{ key: key }, { _id: key as any }] },
      {
        $set: {
          status: 'used',
          usedBy: userId,
          usedAt: Date.now()
        }
      }
    );

    return NextResponse.json({
      success: true,
      durationDays: keyDoc.durationDays || 30
    });
  } catch (error) {
    console.error('Error activating key in MongoDB:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
