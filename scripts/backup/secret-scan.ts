/**
 * Last line of defence against a credential ending up in a backup.
 *
 * Table exclusion and column redaction in config.ts are the primary controls;
 * this catches the case they cannot: a token pasted into a free-text field, or
 * a new column that nobody classified. It runs over every value about to be
 * written and ABORTS the export if anything looks like a live credential.
 *
 * Failing closed is deliberate. A missed backup night is recoverable; a secret
 * quietly archived for years is not.
 *
 * The patterns are narrow on purpose. They match shapes that are essentially
 * never ordinary business text (a JWT, a payment-provider secret, a PEM
 * private key), so a customer called "Token Traders" does not stop the backup.
 *
 * Findings carry the table, primary key and column -- never the value, so the
 * error message and the CI log cannot become a second leak.
 */

interface Pattern {
  name: string;
  re: RegExp;
}

const PATTERNS: Pattern[] = [
  // Three base64url segments starting with a JWT header. Covers Supabase anon,
  // service-role and user tokens.
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/ },
  { name: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'Stripe/Razorpay-style secret key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/ },
  { name: 'Razorpay key id', re: /\brzp_(?:live|test)_[A-Za-z0-9]{8,}/ },
  { name: 'PEM private key', re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/ },
  { name: 'age secret key', re: /\bAGE-SECRET-KEY-(?:PQ-)?1[A-Z0-9]{20,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/ },
  { name: 'Authorization header value', re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
];

export interface SecretFinding {
  table: string;
  primaryKey: string;
  column: string;
  pattern: string;
}

/** Thrown when a backup would have contained something credential-shaped. */
export class SecretFoundError extends Error {
  readonly findings: SecretFinding[];
  constructor(findings: SecretFinding[]) {
    const lines = findings
      .slice(0, 10)
      .map((f) => `  ${f.table} [${f.primaryKey}] column "${f.column}": looks like a ${f.pattern}`);
    const more = findings.length > 10 ? `\n  ...and ${findings.length - 10} more` : '';
    super(
      `Refusing to write the backup: ${findings.length} value(s) look like credentials.\n` +
        lines.join('\n') +
        more +
        '\nRemove the credential from that row, or add the column to `redact` in scripts/backup/config.ts.' +
        '\n(The values themselves are deliberately not printed.)',
    );
    this.name = 'SecretFoundError';
    this.findings = findings;
  }
}

/** Every string anywhere inside a value, including jsonb objects and arrays. */
function* strings(value: unknown, depth = 0): Generator<string> {
  if (depth > 20 || value === null || value === undefined) return;
  if (typeof value === 'string') {
    yield value;
  } else if (Array.isArray(value)) {
    for (const v of value) yield* strings(v, depth + 1);
  } else if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) yield* strings(v, depth + 1);
  }
}

export function findSecretsInRow(
  table: string,
  primaryKey: string,
  row: Record<string, unknown>,
): SecretFinding[] {
  const found: SecretFinding[] = [];
  for (const [column, value] of Object.entries(row)) {
    for (const text of strings(value)) {
      // Cheap reject: nothing credential-shaped is shorter than this.
      if (text.length < 16) continue;
      const hit = PATTERNS.find((p) => p.re.test(text));
      if (hit) {
        found.push({ table, primaryKey, column, pattern: hit.name });
        break; // one finding per column is enough to act on
      }
    }
  }
  return found;
}

/** Throws SecretFoundError if any row in any table looks like it holds a credential. */
export function assertNoSecrets(
  tables: Record<string, { primaryKey: string[]; rows: Record<string, unknown>[] }>,
): void {
  const all: SecretFinding[] = [];
  for (const [table, { primaryKey, rows }] of Object.entries(tables)) {
    for (const row of rows) {
      const pk = primaryKey.map((c) => String(row[c] ?? '')).join('|');
      all.push(...findSecretsInRow(table, pk, row));
    }
  }
  if (all.length > 0) throw new SecretFoundError(all);
}
