import { NextResponse } from '../../next-response.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../utils/supabase-admin.ts';
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

const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

/** Does this token belong to the requested userId (uid, email alias or phone alias)? */
function isOwnerOf(decodedToken: { uid: string; email?: string; phone_number?: string }, userId: string): boolean {
  if (decodedToken.uid === userId) return true;

  const tokenEmail = decodedToken.email ? normalizeString(decodedToken.email) : '';
  const userEmail = userId.startsWith('e_') ? normalizeString(userId.substring(2)) : normalizeString(userId);
  if (tokenEmail && tokenEmail === userEmail) return true;

  const tokenPhone = decodedToken.phone_number ? normalizePhone(decodedToken.phone_number) : '';
  const userPhone = userId.startsWith('p_') ? normalizePhone(userId.substring(2)) : normalizePhone(userId);
  if (tokenPhone && tokenPhone === userPhone) return true;

  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');

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

    if (!checkIsAdmin(decodedToken) && !isOwnerOf(decodedToken, userId)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access these keys.' }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true, keys: [] });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('keys')
      .select('key, duration_days, created_at, status')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedKeys = (data || []).map(k => ({
      key: k.key,
      duration: k.duration_days === 365 ? 'Annual' : 'Monthly',
      createdAt: k.created_at || Date.now(),
      status: k.status || 'unused'
    }));

    return NextResponse.json({ keys: mappedKeys });
  } catch (error) {
    console.error('Error fetching keys from Supabase:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

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
    if (!checkIsAdmin(decodedToken)) {
      console.warn(`Unauthorized key generation attempt by ${decodedToken.uid}`);
      return NextResponse.json({ error: 'Forbidden: Only administrators can generate keys.' }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('keys')
      .upsert({
        key,
        duration_days: durationDays || 30,
        status: 'unused',
        created_at: Date.now(),
        created_by: createdBy
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating key in Supabase:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const rawBody = await request.json();

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
    if (!checkIsAdmin(decodedToken) && !isOwnerOf(decodedToken, userId)) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify keys for another user.' }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ isOfflineFallback: true });
    }

    const supabase = getSupabaseAdmin();
    const { data: keyDoc, error: findError } = await supabase
      .from('keys')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (findError) throw findError;
    if (!keyDoc) {
      return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
    }

    const durationDays = keyDoc.duration_days || 30;

    if (keyDoc.status === 'used') {
      if (keyDoc.used_by !== userId) {
        return NextResponse.json({ error: 'Key already used by another account.' }, { status: 400 });
      }

      // Device binding: a key may only be active on one device at a time
      if (deviceId) {
        if (keyDoc.used_on_device && keyDoc.used_on_device !== deviceId) {
          return NextResponse.json({
            error: 'This license key is already active on another system/device. Concurrent usage is blocked.'
          }, { status: 400 });
        }

        // If not bound to a device yet, bind it now
        if (!keyDoc.used_on_device) {
          const { error: bindError } = await supabase
            .from('keys')
            .update({ used_on_device: deviceId })
            .eq('key', key);
          if (bindError) throw bindError;
        }
      }

      const expiryTime = (keyDoc.used_at || keyDoc.created_at || Date.now()) + (durationDays * 24 * 60 * 60 * 1000);
      if (Date.now() > expiryTime) {
        return NextResponse.json({ error: 'Key has expired.' }, { status: 400 });
      }

      return NextResponse.json({ success: true, durationDays });
    }

    // New unused key activation
    const updateObj: Record<string, unknown> = {
      status: 'used',
      used_by: userId,
      used_at: Date.now()
    };
    if (deviceId) {
      updateObj.used_on_device = deviceId;
    }

    const { error: activateError } = await supabase
      .from('keys')
      .update(updateObj)
      .eq('key', key);

    if (activateError) throw activateError;

    return NextResponse.json({ success: true, durationDays });
  } catch (error) {
    console.error('Error activating key in Supabase:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
