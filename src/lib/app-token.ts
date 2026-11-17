import crypto from 'node:crypto';

function signingSecret(): string | null {
  const secret = process.env.APP_TOKEN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function signAppToken(userId: string): string {
  const secret = signingSecret();
  if (!secret) throw new Error('App sign-in is not configured. Set a private APP_TOKEN_SECRET of at least 32 characters.');
  if (!userId) throw new Error('Invalid app user identifier.');
  return `${userId}.${crypto.createHmac('sha256', secret).update(userId).digest('hex')}`;
}

export function verifyAppToken(token: string): { uid: string; email?: string; phone_number?: string } | null {
  const secret = signingSecret();
  if (!secret) return null;
  const delimiter = token.lastIndexOf('.');
  if (delimiter < 1) return null;
  const userId = token.slice(0, delimiter);
  const signature = token.slice(delimiter + 1);
  if (!userId || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = crypto.createHmac('sha256', secret).update(userId).digest();
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return null;
  if (userId.startsWith('p_')) return { uid: userId, phone_number: userId.slice(2) };
  if (userId.startsWith('e_')) return { uid: userId, email: userId.slice(2) };
  return { uid: userId };
}
