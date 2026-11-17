/**
 * Utility for verifying Supabase JWT Tokens securely using the Supabase Client.
 */

import { verifyAppToken } from './app-token.ts';
export { signAppToken, verifyAppToken } from './app-token.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wxgzbfjosxficpeczgvj.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string; phone_number?: string } | null> {
  // If it's our custom HMAC token (format: userId.signature)
  if (idToken.includes('.')) {
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
