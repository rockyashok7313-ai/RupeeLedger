import type { Account, Transaction } from './types.ts';

export function readDeviceLedger(storage: Storage, owner: string, branch: string): { accounts: Account[]; transactions: Transaction[] } {
  const read = (kind: string) => {
    const text = storage.getItem(`rupee_ledger_${kind}_${owner}_${branch}`) ||
      (branch === 'hq' ? storage.getItem(`rupee_ledger_${kind}_${owner}`) : null);
    if (!text) return [];
    try { const rows = JSON.parse(text); return Array.isArray(rows) ? rows : []; } catch { return []; }
  };
  return { accounts: read('accounts'), transactions: read('transactions') };
}

/** Keep the previous device copy before a smaller/different load can replace it. */
export function preserveDeviceLedger(storage: Storage, owner: string, branch: string): void {
  const current = readDeviceLedger(storage, owner, branch);
  if (!current.accounts.length && !current.transactions.length) return;
  const key = `rupee_ledger_recovery_${owner}_${branch}`;
  const history = JSON.parse(storage.getItem(key) || '[]');
  const encoded = JSON.stringify(current);
  if (history[0]?.data === encoded) return;
  storage.setItem(key, JSON.stringify([{ at: Date.now(), data: encoded }, ...history].slice(0, 12)));
}

export function deviceBranches(storage: Storage, owner: string): string[] {
  const branches = new Set<string>(['hq']);
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i) || '';
    for (const kind of ['accounts', 'transactions', 'expenses']) {
      const prefix = `rupee_ledger_${kind}_${owner}_`;
      if (key.startsWith(prefix)) {
        const branch = key.slice(prefix.length);
        if (branch === 'hq' || /^branch_\d+$/.test(branch)) branches.add(branch);
      }
    }
  }
  return [...branches];
}
