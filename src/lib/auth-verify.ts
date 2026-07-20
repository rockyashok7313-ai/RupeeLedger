/**
 * Utility for verifying Supabase JWT Tokens securely using the Supabase Client.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wxgzbfjosxficpeczgvj.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string; phone_number?: string } | null> {
  // If it's our custom HMAC token (format: userId.signature)
  if (idToken.includes('.') && idToken.split('.').length === 2) {
    const verified = verifyAppToken(idToken);
    if (verified) return verified;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(idToken);
    if (error || !user) {
      console.error('Token verification failed:', error?.message);
      return null;
    }
    
    return {
      uid: user.id,
      email: user.email,
      phone_number: user.phone
    };
  } catch (error) {
    console.error('Error verifying Supabase JWT:', error);
    return null;
  }
}

/**
 * Helper to extract Bearer token from Request headers.
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split('Bearer ')[1];
}

const SECRET = process.env.APP_TOKEN_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'default-secret-key';

export function signAppToken(userId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(userId);
  const sig = hmac.digest('hex');
  return `${userId}.${sig}`;
}

export function verifyAppToken(token: string): { uid: string; email?: string; phone_number?: string } | null {
  const [userId, sig] = token.split('.');
  if (!userId || !sig) return null;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(userId);
  const expectedSig = hmac.digest('hex');
  if (sig === expectedSig) {
    if (userId.startsWith('p_')) {
      return { uid: userId, phone_number: userId.replace('p_', '') };
    }
    if (userId.startsWith('e_')) {
      return { uid: userId, email: userId.replace('e_', '') };
    }
    return { uid: userId };
  }
  return null;
}

export function checkIsAdmin(decodedToken: { uid: string; email?: string; phone_number?: string } | null): boolean {
  if (!decodedToken) return false;
  
  const adminIdsEnv = process.env.ADMIN_USER_IDS || '';
  const adminIds = adminIdsEnv
    .split(',')
    .map(id => id.trim().toLowerCase())
    .filter(Boolean);
    
  if (adminIds.length === 0) {
    return false; // Default: Admin actions fully disabled if not set
  }
  
  const uid = decodedToken.uid.toLowerCase();
  const email = decodedToken.email?.trim().toLowerCase();
  const phone = decodedToken.phone_number?.replace(/\D/g, '');
  
  return adminIds.includes(uid) || 
         (email ? adminIds.includes(email) : false) || 
         (phone ? adminIds.includes(phone) : false);
}
