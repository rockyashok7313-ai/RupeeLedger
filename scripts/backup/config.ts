/**
 * What the off-site backup contains, and what it deliberately leaves out.
 *
 * Every table in the `public` schema must appear in exactly one of the two maps
 * below. The export FAILS if the database has a table that appears in neither,
 * so a table added later can never be silently missing from the backup (or,
 * worse, silently included without anyone deciding whether it holds secrets).
 *
 * Two rules drive the classification:
 *
 *   1. Business records are backed up in full: ledgers, GST documents, stock,
 *      the loom-production data in `skt_kv`, business profiles, subscriptions.
 *
 *   2. Credentials are never backed up: licence keys, PIN hashes, one-time
 *      codes, password-style hashes. The backup is encrypted, but "encrypted"
 *      is not a reason to carry secrets around -- the point is that the file is
 *      worth very little to anyone who ever gets it open. The consequence is
 *      listed in docs/OFFSITE_BACKUP.md so nobody is surprised at restore time.
 */

export interface TablePolicy {
  /** Primary key columns. Used for stable paging and for insert-only restore. */
  primaryKey: string[];
  /** Columns removed from every row before it is written. */
  redact?: string[];
  /** Why this table is in the backup, or why a column is redacted. */
  note?: string;
}

export const INCLUDE: Record<string, TablePolicy> = {
  // --- ledger -------------------------------------------------------------
  accounts: { primaryKey: ['id'] },
  transactions: { primaryKey: ['id'] },
  business_profiles: { primaryKey: ['user_id'] },
  subscriptions: {
    primaryKey: ['user_id'],
    redact: ['licenseKey'],
    note: 'licenseKey is a credential; the plan, status and renewal date are kept.',
  },

  // --- GST / invoicing ----------------------------------------------------
  clients: { primaryKey: ['id'] },
  company: { primaryKey: ['id'] },
  customers: { primaryKey: ['id'] },
  expenses: { primaryKey: ['id'] },
  invoices: { primaryKey: ['id'] },
  receipts: { primaryKey: ['id'] },
  recurring_templates: { primaryKey: ['id'] },
  vendors: { primaryKey: ['id'] },

  // --- inventory / ERP ----------------------------------------------------
  inventory: { primaryKey: ['id'] },
  products: { primaryKey: ['id'] },
  purchase_invoices: { primaryKey: ['id'] },
  purchase_orders: { primaryKey: ['id'] },
  sale_invoices: { primaryKey: ['id'] },
  sales_orders: { primaryKey: ['id'] },
  stock: { primaryKey: ['id'] },
  stock_movements: { primaryKey: ['id'] },
  warehouses: { primaryKey: ['id'] },

  // --- loom production app that shares this project -------------------------
  skt_kv: {
    primaryKey: ['k'],
    note: 'Daily production, looms and qualities. Checked: no credential-shaped values.',
  },
  skt_build: { primaryKey: ['name'], note: 'Uploaded build text files.' },
};

export const EXCLUDE: Record<string, string> = {
  keys: 'Licence keys are credentials. Restoring means re-issuing keys from payment records.',
  otps: 'One-time login codes. Expire in minutes; nothing to restore.',
  rate_limits: 'Throttling counters. Rebuilt automatically.',
  security_settings: 'App-lock PIN and its hash. A restored PIN would be a credential in a file; users re-set it.',
  skt_secret: 'A secret hash.',
  ledger_backups:
    'In-database daily snapshots, redundant with the off-site history itself and the largest way to bloat the file.',
};

/**
 * Rows fetched per request. PostgREST caps a response at `max_rows` (1000 by
 * default on Supabase) and truncates SILENTLY. That is exactly how the sync
 * route once lost data, so this stays below the cap and every table is also
 * checked against an exact row count.
 */
export const PAGE_SIZE = 500;

/** How many times to re-read a table whose count moved while it was being read. */
export const MAX_CONSISTENCY_ATTEMPTS = 3;

/** Bumped when the structure of the snapshot file changes. */
export const SNAPSHOT_FORMAT = 'rupeeledger-offsite-backup';
export const SNAPSHOT_VERSION = 1;
