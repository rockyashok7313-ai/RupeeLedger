/**
 * Credentials must never travel inside a backup, and never be read back out of
 * one. Two layers are checked here:
 *
 *   1. stripCredentials(), the server-side backstop used by /api/ledger/backup.
 *   2. A source-level tripwire on the client: the places that build or apply a
 *      backup must not mention `subscription` or `securitySettings`. It reads
 *      App.tsx as text, so it fails the moment someone puts them back, which is
 *      an easy change to make and invisible in a UI test.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CREDENTIAL_KEYS, stripCredentials } from '../../backend/utils/backup-payload.ts';

test('stripCredentials removes the licence key and PIN carriers, keeps everything else', () => {
  const payload = {
    accounts: [{ id: 'a1' }],
    transactions: [{ id: 't1', amount: 10 }],
    businessProfile: { companyName: 'SKT' },
    subscription: { plan: 'pro', licenseKey: 'LIC-SECRET' },
    securitySettings: { pinEnabled: true, pinCode: '1234', hashedPinCode: 'abc' },
  };
  const clean = stripCredentials(payload);
  assert.deepEqual(Object.keys(clean).sort(), ['accounts', 'businessProfile', 'transactions']);
  assert.ok(!JSON.stringify(clean).includes('LIC-SECRET') && !JSON.stringify(clean).includes('1234'));
  assert.ok('subscription' in payload, 'the input is not mutated');
});

test('stripCredentials tolerates payloads that are not plain objects', () => {
  assert.equal(stripCredentials(null), null);
  assert.deepEqual(stripCredentials([1, 2]), [1, 2]);
  assert.equal(stripCredentials('text'), 'text');
  assert.deepEqual(CREDENTIAL_KEYS, ['subscription', 'securitySettings']);
});

// ---------------------------------------------------------------------------
// Client tripwire
// ---------------------------------------------------------------------------

const app = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');

/** Text of the block starting at `marker`, up to its closing line, with comments removed. */
function block(marker: string, closing: RegExp): string {
  const start = app.indexOf(marker);
  assert.ok(start >= 0, `found "${marker}" in App.tsx`);
  const rest = app.slice(start);
  const end = rest.search(closing);
  assert.ok(end > 0, `found the end of "${marker}"`);
  return rest
    .slice(0, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

const CREDENTIAL = /\b(subscription|securitySettings)\b/;

test('the Export button builds its file without subscription or securitySettings', () => {
  const body = block('const handleExportData = () => {', /\r?\n  \};/);
  assert.ok(body.includes('accounts') && body.includes('transactions'), 'sanity: it is the export function');
  assert.doesNotMatch(body, CREDENTIAL);
});

test('the daily backup payload (local slots and cloud snapshot) has no credentials', () => {
  const body = block('const backupData = {', /\r?\n    \};/);
  assert.ok(body.includes('accounts') && body.includes('transactions'), 'sanity: it is the backup payload');
  assert.doesNotMatch(body, CREDENTIAL);
});

test('restoring from a file or snapshot never reads subscription or securitySettings out of it', () => {
  const restoreSnapshot = block('const applyRestoredSnapshot = (payload: any) => {', /\r?\n  \};/);
  const importFile = block('const handleImportData = (', /\r?\n  \};/);
  assert.ok(restoreSnapshot.includes('recalculateData') && importFile.includes('recalculateData'), 'sanity');
  assert.doesNotMatch(restoreSnapshot, /\b(payload)\??\.(subscription|securitySettings)\b/);
  assert.doesNotMatch(importFile, /\b(parsed)\??\.(subscription|securitySettings)\b/);
  assert.doesNotMatch(importFile, /setSubscription|setSecuritySettings/);
  assert.doesNotMatch(restoreSnapshot, /setSubscription|setSecuritySettings/);
});
