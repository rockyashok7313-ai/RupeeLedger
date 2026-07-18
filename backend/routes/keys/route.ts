import { NextResponse } from '../../next-response.ts';
import { getMongoDb, isMongoConfigured } from '../../../src/lib/mongodb.ts';
import { verifyIdToken, extractToken, checkIsAdmin } from '../../../src/lib/auth-verify.ts';
import { z } from 'zod';

const getKeysQuerySchema = z.string().trim().min(1, 'Missing userId parameter.');

const postKeySchema = z.object({
  key: z.string().trim().min(1, 'Key string is required.'),
  durationDays: z.number().int().positive().optional(),
  createdBy: z.string().trim().min(1, 'createdBy identifier is required.')
});

const putKeySchema = z.object({
  key: z.string().trim().min(1, 'Key string is required.'),
  userId: z.string().trim().min(1, 'userId is required.'),
  deviceId: z.string().trim().optional()
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');

    // Query validation
    const parsedUser = getKeysQuerySchema.safeParse(rawUserId);
    if (!parsedUser.success) {
      return NextResponse.json({ error: 'Missing or invalid userId parameter.' }, { status: 400 });
    }
    const userId = parsedUser.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    // Check if user is admin using central environment-backed helper
    const isAdmin = checkIsAdmin(decodedToken);
    
    // Check if caller owns this userId profile
    const isOwner = decodedToken.uid === userId || (() => {
      const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

      const tokenEmail = decodedToken.email ? normalizeString(decodedToken.email) : '';
      const userEmail = userId.startsWith('e_') ? normalizeString(userId.substring(2)) : normalizeString(userId);
      if (tokenEmail && tokenEmail === userEmail) return true;

      const tokenPhone = decodedToken.phone_number ? normalizePhone(decodedToken.phone_number) : '';
      const userPhone = userId.startsWith('p_') ? normalizePhone(userId.substring(2)) : normalizePhone(userId);
      if (tokenPhone && tokenPhone === userPhone) return true;

      return false;
    })();

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
    const rawBody = await request.json();
    
    // Body schema validation
    const parsedBody = postKeySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      const errorMsg = parsedBody.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const { key, durationDays, createdBy } = parsedBody.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    // Require admin privileges to generate license keys
    const isAdmin = checkIsAdmin(decodedToken);
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
    const rawBody = await request.json();
    
    // Body schema validation
    const parsedBody = putKeySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      const errorMsg = parsedBody.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const { key, userId, deviceId } = parsedBody.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    // IDOR Protection: Verify caller owns this userId profile or is an admin
    const isAdmin = checkIsAdmin(decodedToken);
    const isOwner = decodedToken.uid === userId || (() => {
      const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

      const tokenEmail = decodedToken.email ? normalizeString(decodedToken.email) : '';
      const userEmail = userId.startsWith('e_') ? normalizeString(userId.substring(2)) : normalizeString(userId);
      if (tokenEmail && tokenEmail === userEmail) return true;

      const tokenPhone = decodedToken.phone_number ? normalizePhone(decodedToken.phone_number) : '';
      const userPhone = userId.startsWith('p_') ? normalizePhone(userId.substring(2)) : normalizePhone(userId);
      if (tokenPhone && tokenPhone === userPhone) return true;

      return false;
    })();

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify keys for another user.' }, { status: 403 });
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
      const isSameUser = keyDoc.usedBy === userId;
      if (!isSameUser) {
        return NextResponse.json({ error: 'Key already used by another account.' }, { status: 400 });
      }

      // Check device verification
      if (deviceId) {
        if (keyDoc.usedOnDevice && keyDoc.usedOnDevice !== deviceId) {
          return NextResponse.json({ 
            error: 'This license key is already active on another system/device. Concurrent usage is blocked.' 
          }, { status: 400 });
        }
        
        // If not bound to a device yet, bind it now
        if (!keyDoc.usedOnDevice) {
          await keysCollection.updateOne(
            { _id: keyDoc._id },
            { $set: { usedOnDevice: deviceId } }
          );
        }
      }

      // Check if expired
      const durationDays = keyDoc.durationDays || 30;
      const expiryTime = (keyDoc.usedAt || keyDoc.createdAt || Date.now()) + (durationDays * 24 * 60 * 60 * 1000);
      if (Date.now() > expiryTime) {
        return NextResponse.json({ error: 'Key has expired.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        durationDays: durationDays
      });
    }

    // New unused key activation
    const updateObj: any = {
      status: 'used',
      usedBy: userId,
      usedAt: Date.now()
    };
    
    if (deviceId) {
      updateObj.usedOnDevice = deviceId;
    }

    await keysCollection.updateOne(
      { $or: [{ key: key }, { _id: key as any }] },
      {
        $set: updateObj
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
