/**
 * Keeps credentials out of stored ledger snapshots.
 *
 * The app no longer puts `subscription` (carries the licence key) or
 * `securitySettings` (carries the app-lock PIN) into a backup payload. This is
 * the server-side backstop for everything the client does not control: a
 * browser still running an older cached copy of the app, a hand-made request,
 * or a snapshot stored before the client was fixed.
 *
 * It is applied when a snapshot is WRITTEN (so the table never holds them) and
 * when one is READ BACK (so an old row cannot hand them to a restore).
 */
export const CREDENTIAL_KEYS = ['subscription', 'securitySettings'] as const;

export function stripCredentials<T>(payload: T): T {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const copy = { ...(payload as Record<string, unknown>) };
  for (const key of CREDENTIAL_KEYS) delete copy[key];
  return copy as T;
}
