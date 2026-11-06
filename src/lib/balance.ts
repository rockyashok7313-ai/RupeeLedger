import type { Account, Transaction } from './types';

/**
 * Balance arithmetic for the ledger.
 *
 * Two rules hold everywhere in here, and they are the whole point of the file:
 *
 *   1. A balance is DERIVED, never trusted. `currentBalance` on an account and
 *      `balanceAfter` on a transaction are caches for display and offline use.
 *      Whenever the ledger is loaded or changed they are recomputed from the
 *      transactions, so a stale or partial write can no longer leave a wrong
 *      number sitting on screen.
 *
 *   2. Money is added up in paise, as integers. Repeatedly adding floating
 *      point rupees across a thousand rows accumulates error; integers cannot
 *      drift.
 *
 * Previously `currentBalance` was computed once on the client and pushed to the
 * server, so any moment the client held an incomplete set of transactions the
 * stored balance went wrong and stayed wrong.
 */

/** Rupees to integer paise, rounded half-up so 0.1 + 0.2 cannot drift. */
export function toPaise(rupees: number | null | undefined): number {
  if (rupees === null || rupees === undefined || !Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/** Integer paise back to rupees. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

/**
 * A deterministic order for running balances.
 *
 * Sorting on `date` alone is not enough: this ledger has 136 dates carrying
 * more than one entry and one carrying 33, and `Array.prototype.sort` leaves
 * ties in whatever order the array happened to arrive in. That order changes
 * between a local load and a server pull, so the running balance column
 * changed between sessions for the same unchanged data.
 *
 * `id` breaks the tie. Entries made on the same day still have no meaningful
 * sequence — the ledger does not record a time — but the order is at least
 * stable, so the same ledger always renders the same column.
 */
export function orderForRunningBalance<T extends { date: number; id: string }>(txs: T[]): T[] {
  return [...txs].sort((a, b) => {
    const byDate = (a.date ?? 0) - (b.date ?? 0);
    if (byDate !== 0) return byDate;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** Signed effect of one entry, in paise. Credit adds, Debit subtracts. */
function signedPaise(t: Transaction): number {
  const magnitude = Math.abs(toPaise(t.amount));
  return t.type === 'Credit' ? magnitude : -magnitude;
}

export interface LedgerTotals {
  /** Sum of every Credit, in rupees. */
  credits: number;
  /** Sum of every Debit, in rupees. */
  debits: number;
  /** Opening balances across the accounts included. */
  opening: number;
  /** opening + credits - debits. */
  closing: number;
  transactionCount: number;
}

/**
 * Recompute every balance from the transactions.
 *
 * Returns new arrays; neither input is mutated. Transactions belonging to no
 * known account are passed through untouched rather than dropped, so a sync
 * that is mid-flight cannot silently lose rows.
 */
export function computeLedger(
  accounts: Account[],
  transactions: Transaction[],
): { accounts: Account[]; transactions: Transaction[] } {
  const byAccount = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = byAccount.get(t.accountId);
    if (list) list.push(t);
    else byAccount.set(t.accountId, [t]);
  }

  const rebuilt: Transaction[] = [];
  const nextAccounts = accounts.map(acc => {
    const own = orderForRunningBalance(byAccount.get(acc.id) ?? []);
    byAccount.delete(acc.id);

    let runningPaise = toPaise(acc.initialBalance);
    for (const t of own) {
      runningPaise += signedPaise(t);
      rebuilt.push({ ...t, balanceAfter: fromPaise(runningPaise) });
    }

    return { ...acc, currentBalance: fromPaise(runningPaise) };
  });

  // Anything left belongs to an account this client does not have loaded.
  for (const orphans of byAccount.values()) rebuilt.push(...orphans);

  return { accounts: nextAccounts, transactions: rebuilt };
}

/** Totals across a set of transactions, for reports and summaries. */
export function computeTotals(accounts: Account[], transactions: Transaction[]): LedgerTotals {
  let creditPaise = 0;
  let debitPaise = 0;
  for (const t of transactions) {
    const magnitude = Math.abs(toPaise(t.amount));
    if (t.type === 'Credit') creditPaise += magnitude;
    else debitPaise += magnitude;
  }
  const openingPaise = accounts.reduce((sum, a) => sum + toPaise(a.initialBalance), 0);

  return {
    credits: fromPaise(creditPaise),
    debits: fromPaise(debitPaise),
    opening: fromPaise(openingPaise),
    closing: fromPaise(openingPaise + creditPaise - debitPaise),
    transactionCount: transactions.length,
  };
}

export interface BalanceDiscrepancy {
  accountId: string;
  accountName: string;
  stored: number;
  computed: number;
  difference: number;
}

/**
 * Compare the stored balances against a fresh computation.
 *
 * Nothing in the app depends on this to render — it exists so a drift can be
 * reported rather than discovered later in a total that looks plausible.
 */
export function auditBalances(
  accounts: Account[],
  transactions: Transaction[],
): BalanceDiscrepancy[] {
  const { accounts: computed } = computeLedger(accounts, transactions);
  const out: BalanceDiscrepancy[] = [];

  for (let i = 0; i < accounts.length; i++) {
    const storedPaise = toPaise(accounts[i].currentBalance);
    const computedPaise = toPaise(computed[i].currentBalance);
    if (storedPaise !== computedPaise) {
      out.push({
        accountId: accounts[i].id,
        accountName: accounts[i].name,
        stored: fromPaise(storedPaise),
        computed: fromPaise(computedPaise),
        difference: fromPaise(computedPaise - storedPaise),
      });
    }
  }
  return out;
}
