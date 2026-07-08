/**
 * Utility for verifying Firebase ID Tokens securely using the Firebase REST API.
 * This avoids needing the heavy firebase-admin SDK and service accounts in serverless environments.
 */

import crypto from 'crypto';

export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string; phone_number?: string } | null> {
  // If it's our custom HMAC token (format: userId.signature)
  if (idToken.includes('.') && idToken.split('.').length === 2) {
    const verified = verifyAppToken(idToken);
    if (verified) return verified;
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!apiKey) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable.');
    return null;
  }

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idToken
      }),
      // We don't want Next.js caching this auth lookup
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Token verification failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data && data.users && data.users.length > 0) {
      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email,
        phone_number: user.phoneNumber
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
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

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'default-secret-key';

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
