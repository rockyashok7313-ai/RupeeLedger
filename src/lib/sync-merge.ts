/**
 * Reconciling a cloud pull against what the device already holds.
 *
 * Every load path used to do `setTransactions(cloud.transactions || [])`, which
 * takes the server's answer as the whole truth. That is only safe when the
 * server's answer is complete, and it is not always: a truncated page, a
 * request that raced a write, a branch that has not finished syncing, or an
 * outright empty response all arrive looking like a valid, smaller ledger. The
 * device then throws away records it was holding.
 *
 * Nothing here deletes. A record present on either side survives the merge, and
 * where the two disagree the device's copy is kept and the disagreement is
 * reported rather than resolved silently -- the user is looking at this device,
 * and a conflict they are told about is recoverable where one they are not told
 * about is not.
 *
 * Deliberate deletions still work: they travel through the explicit
 * deletedTransactionIds / deletedAccountIds path on /api/ledger/sync, not by a
 * record quietly going missing from a pull.
 */

export interface MergeOutcome<T> {
  merged: T[];
  /** Held by this device but absent from the cloud response. */
  localOnly: number;
  /** Present in the cloud response but not yet on this device. */
  cloudOnly: number;
  /** Same id on both sides with differing contents. The device's copy is kept. */
  conflicts: string[];
}

/** Stable comparison that ignores key order. */
function sameContent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a, Object.keys(a as object).sort()) ===
           JSON.stringify(b, Object.keys(b as object).sort());
  } catch {
    return false;
  }
}

/**
 * Union of two record sets by id. Never drops a record from either side.
 */
export function mergeById<T extends { id: string }>(local: T[], cloud: T[]): MergeOutcome<T> {
  const byId = new Map<string, T>();
  const conflicts: string[] = [];

  for (const row of cloud) {
    if (row && row.id != null) byId.set(String(row.id), row);
  }

  let cloudOnly = byId.size;
  let localOnly = 0;

  for (const row of local) {
    if (!row || row.id == null) continue;
    const id = String(row.id);
    const fromCloud = byId.get(id);

    if (!fromCloud) {
      // Only this device has it: an entry made offline, or one the pull missed.
      byId.set(id, row);
      localOnly++;
      continue;
    }

    cloudOnly--;
    if (!sameContent(row, fromCloud)) {
      // Both sides edited it. Keep the device's copy and say so.
      byId.set(id, row);
      conflicts.push(id);
    }
  }

  return { merged: Array.from(byId.values()), localOnly, cloudOnly, conflicts };
}

export interface PayloadAssessment {
  /** Whether the response looks complete enough to merge at all. */
  usable: boolean;
  reason: string;
}

/**
 * Sanity-check a cloud response before it is allowed anywhere near the ledger.
 *
 * A response that is empty, or dramatically smaller than what the device holds,
 * is far more likely to be a failed or truncated read than a real deletion of
 * most of someone's books.
 */
export function assessCloudPayload(localCount: number, cloudCount: number): PayloadAssessment {
  if (localCount === 0) {
    return { usable: true, reason: 'Nothing held locally; cloud copy is the only one.' };
  }
  if (cloudCount === 0) {
    return {
      usable: false,
      reason: `Cloud returned no records while this device holds ${localCount}. Keeping the device copy.`,
    };
  }
  // A genuine bulk delete is rare; a truncated read is not.
  if (cloudCount < localCount * 0.5) {
    return {
      usable: false,
      reason: `Cloud returned ${cloudCount} records against ${localCount} held here. That looks incomplete, so the device copy is kept.`,
    };
  }
  return { usable: true, reason: 'Cloud response looks complete.' };
}

/**
 * Whether a sync response is older than what this device has already applied.
 *
 * Responses can arrive out of order -- a slow pull landing after a fast one, a
 * retry completing after the request that replaced it. Applying the older one
 * reverts whatever the newer one established.
 */
export function isStaleResponse(requestedAt: number, lastAppliedAt: number): boolean {
  return requestedAt < lastAppliedAt;
}
