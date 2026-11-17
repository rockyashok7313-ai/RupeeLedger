import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { signAppToken, verifyAppToken } from '../../src/lib/app-token.ts';

test('custom sign-in requires a private dedicated secret and rejects public/default fallback tokens', () => {
  const previous = process.env.APP_TOKEN_SECRET;
  try {
    delete process.env.APP_TOKEN_SECRET;
    const forged = `victim.${crypto.createHmac('sha256', 'default-secret-key').update('victim').digest('hex')}`;
    assert.equal(verifyAppToken(forged), null);
    assert.throws(() => signAppToken('victim'), /not configured/);
    process.env.APP_TOKEN_SECRET = 'short';
    assert.equal(verifyAppToken(forged), null);
    assert.throws(() => signAppToken('victim'));
    process.env.APP_TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
    const token = signAppToken('e_client@example.com');
    assert.deepEqual(verifyAppToken(token), { uid: 'e_client@example.com', email: 'client@example.com' });
    assert.equal(verifyAppToken(token + '.extra'), null);
    assert.equal(verifyAppToken(token.replace('e_client', 'e_other')), null);
    assert.equal(verifyAppToken('victim.invalid'), null);
    assert.equal(verifyAppToken(forged), null);
    assert.deepEqual(verifyAppToken(signAppToken('p_919999999999')), { uid: 'p_919999999999', phone_number: '919999999999' });
    const old = signAppToken('owner');
    process.env.APP_TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
    assert.equal(verifyAppToken(old), null);
  } finally {
    if (previous === undefined) delete process.env.APP_TOKEN_SECRET;
    else process.env.APP_TOKEN_SECRET = previous;
  }
});
