export interface SavedBackup {
  id: number;
  taken_on: string;
  created_at?: string;
  account_count: number;
  transaction_count: number;
  byte_size: number;
}

/** A sync response, skipped snapshot, or offline fallback is never a backup. */
export async function saveCloudBackup(scopedUserId: string, token: string | null, data: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<SavedBackup> {
  if (!token) throw new Error('Sign in again before creating a cloud backup. Your records are unchanged.');
  const res = await fetcher('/api/ledger/backup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: scopedUserId, action: 'snapshot', data }),
    signal: AbortSignal.timeout(45000),
  });
  let body: any;
  try { body = await res.json(); } catch { throw new Error(`Cloud backup returned an unreadable response (${res.status}). Retry when connected.`); }
  if (!res.ok) throw new Error(body?.error || `Cloud backup failed (${res.status}).`);
  if (body?.isOfflineFallback) throw new Error('Cloud backups are not configured on the server.');
  if (body?.skipped) throw new Error(body.reason || 'No records were backed up.');
  const saved = body?.backup;
  if (!saved || !Number.isInteger(saved.id) || saved.id <= 0 || !Number.isInteger(saved.transaction_count) || !body.verified) {
    throw new Error('The server did not confirm a verified backup. Retry Backup Now.');
  }
  return saved;
}
