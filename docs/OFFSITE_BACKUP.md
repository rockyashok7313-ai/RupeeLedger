# Encrypted off-site backups

A nightly, encrypted copy of the database that lives **outside Supabase and outside Vercel**, in a bucket you own.

Read [What has and has not been verified](#what-has-and-has-not-been-verified) before relying on it. The first
real run is yours to do and check.

## What this is, and what it is not

Every night at 02:00 India time a GitHub Actions job:

1. reads every business table, the user list and the database schema from Supabase;
2. proves the read was complete (row counts checked, no credential-shaped values);
3. encrypts the result with your **public** key, so the job can write backups but can never read them;
4. uploads the encrypted file to your private bucket.

| It protects against | It does not protect against |
|---|---|
| The Supabase project being deleted, paused for good, or corrupted | Changes made in the last day (a backup is up to ~24 hours old) |
| A bad bulk edit or a deleted record you notice days later | Losing the private key (then no backup can ever be opened) |
| Vercel or GitHub having a bad day (the data is in a third place) | Anything in the tables left out below |

Supabase Free does not include the daily database backups that paid plans have, which is why this exists. The
in-app "Recovery history" (14 daily snapshots) lives in the **same** Supabase project as your live data, so it does not
cover losing that project. Browser storage and cloud sync are not backups either, and the app now says so.

## What is in a backup, and what is left out

Backed up: accounts, transactions, business profiles, subscriptions (plan, status, renewal date), GST documents,
clients, vendors, customers, products, inventory and stock, expenses, receipts, the loom-production data in `skt_kv`,
`skt_build`, the **user list** (id, email, phone, providers, metadata) and the **schema** (tables, indexes, policies,
functions, privileges).

Deliberately **not** backed up, because they are credentials. The rule is that no password or token goes into a backup:

| Left out | Why | What it means after a full restore |
|---|---|---|
| `keys` table, and `subscriptions.licenseKey` | Licence keys are tokens | Licence keys must be re-issued or re-entered from your payment records |
| `security_settings` | App-lock PINs | Everyone re-sets their PIN |
| `skt_secret` | A secret hash | **The loom app cannot sync until you re-insert it** (see step 6 of "Project lost") |
| `otps`, `rate_limits` | Short-lived | Nothing; rebuilt automatically |
| `ledger_backups` | Redundant with off-site history | Nothing |
| Passwords | Never exported by Supabase's admin API | Users sign in again (Google / OTP) |

If you decide licence keys must be recoverable, that is a policy change to make deliberately in
`scripts/backup/config.ts`, not a default.

The same rule now applies inside the app: the **Export** button, the daily snapshot and the cloud snapshot no longer
contain the licence key or PIN, and Import / Restore ignore them if an older file still has them.

## One-time setup

### 1. Create the key pair

On your own computer, in this project folder:

```bash
npm run backup:keygen
```

It writes the **private** key to a file in your home folder and prints only the **public** key (`age1...`). The private
key is never printed, so it does not land in terminal history or logs.

- Copy the private key file into your password manager **and** onto one offline copy (USB drive or paper), then delete
  the original. If it is lost, every backup is permanently unreadable and nobody can recover them.
- The public key is safe to share. It is what the server uses.

### 2. Create a private bucket

Any S3-compatible bucket works. Cloudflare R2 and Backblaze B2 both have a free tier far larger than needed (a backup is
a few MB).

- Make the bucket **private** (no public access).
- Create an access key limited to **this bucket only**. Prefer a key that cannot delete (B2 lets you leave out the delete
  capability). A leaked CI key should not be able to erase your backups.
- Add lifecycle rules: expire `daily/` after 35 days, `monthly/` after 400 days. Turn on versioning if offered.
- Note the **endpoint URL** (R2: `https://<account-id>.r2.cloudflarestorage.com`) and the **bucket name**.

### 3. Add the GitHub secrets

Repository → Settings → Secrets and variables → Actions, or from a terminal (each command prompts for the value, so it is
not stored in shell history):

```bash
gh secret set SUPABASE_URL
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set BACKUP_AGE_RECIPIENT
gh secret set BACKUP_S3_ENDPOINT
gh secret set BACKUP_S3_BUCKET
gh secret set BACKUP_S3_ACCESS_KEY_ID
gh secret set BACKUP_S3_SECRET_ACCESS_KEY
```

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys → the service-role (secret) key |
| `BACKUP_AGE_RECIPIENT` | The **public** `age1...` key from step 1. Never the private one |
| `BACKUP_S3_*` | From step 2 |
| `BACKUP_HEALTHCHECK_URL` | Optional, step 7 |

The run fails with the **names** of anything missing, and refuses to start if `BACKUP_AGE_RECIPIENT` contains a private
key. Credentials live only in GitHub's encrypted secrets and are never written to a file or log.

### 4. Apply the schema function

`supabase/migrations/0004_backup_schema_function.sql` adds `public.backup_schema_ddl()`. It only **reads** the catalog,
and only `service_role` may call it. Apply it the way you applied 0001 to 0003 (Supabase SQL editor, or the CLI).

Until it is applied the backup still runs and still captures all data, but it reports
`Schema was NOT captured` as a warning, and restoring into a brand-new project would then need the tables created by hand.

### 5. Merge, then run it once

GitHub runs scheduled workflows **only from the default branch**, and a workflow does not appear for manual runs until it
is there either. After the change is merged to `main`: Actions → **Off-site backup** → **Run workflow**. Confirm the file
appears under `daily/` in the bucket.

### 6. Do a restore drill, now, not later

A backup you have never restored is a hope, not a backup. Download one file from the bucket and run step A below. It
takes two minutes and proves the key, the file and the tool all work together.

### 7. Optional but recommended: a missed-night alarm

GitHub switches off scheduled workflows in a **public** repository after 60 days without repository activity, and it does
so silently. Create a free check at [healthchecks.io](https://healthchecks.io) (period 1 day, grace 3 hours), and store
its ping URL as `BACKUP_HEALTHCHECK_URL`. The job pings it only after a successful upload, so you get an email whenever a
night is missed, for any reason.

## Checking it is working

- Each morning's run should be green under the Actions tab. GitHub emails you when a scheduled run fails.
- The bucket should gain one `daily/…json.gz.age` and one `…manifest.json` per night. The manifest holds counts and
  hashes only.
- Logs on GitHub deliberately omit per-table row counts, because this repository is public.

## Restoring

Everything runs on your computer with the **private key**, which you pass as a file. Nothing is ever written unless you
add `--apply`. Restore **never deletes** anything.

Download the file you want from the bucket first (`daily/` for recent days, `monthly/` for older).

### A. Open it and check it (writes nothing)

```bash
npm run backup:restore -- rupeeledger-20261106T203000Z.json.gz.age --identity-file ~/rupeeledger-backup-key.txt
```

Prints when it was taken, which project it came from, every table's row count, and `Integrity OK` once every table's
count and SHA-256 matches. A wrong key, a damaged download or a tampered file stops with a clear message.

### B. Records were deleted or are wrong

Point the environment at the live project, then compare:

```bash
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in this terminal
npm run backup:restore -- <file> --identity-file <key> --diff
```

The table shows, per table: **missing** (in the backup, gone from live), **changed**, **same**, and **live-only** (newer
than the backup, always kept). Then:

```bash
# Put back what is missing. Existing rows and newer edits are left exactly as they are.
npm run backup:restore -- <file> --identity-file <key> --apply --confirm-project <project-ref>

# Also revert rows that differ from the backup. Use only when you mean it.
npm run backup:restore -- <file> --identity-file <key> --apply --overwrite --confirm-project <project-ref>
```

`--confirm-project` must equal the ref of the project being written to, so a restore cannot reach the wrong project by
accident. Add `--tables transactions,accounts` to limit the scope. Run `--diff` again afterwards: `missing` should be 0.

### C. The Supabase project is lost, paused for good, or corrupted

1. **Create a new project.** Note its ref and its URL and service-role key.
2. **Rebuild the schema.** Write it out and run it in the new project's SQL editor:
   ```bash
   npm run backup:restore -- <file> --identity-file <key> --schema-out schema.sql
   ```
   If the editor complains about a `create extension` line for a platform extension, delete that line and run it again.
   The script is safe to run twice. It needs Postgres 17 or newer (Supabase's current version).
3. **Restore the data.** With the **new** project's `SUPABASE_URL` and key in the terminal:
   ```bash
   npm run backup:restore -- <file> --identity-file <key> --diff
   npm run backup:restore -- <file> --identity-file <key> --apply --confirm-project <new-ref>
   ```
4. **Re-seed the sequences**, or the next insert collides with restored rows. In the SQL editor:
   ```sql
   select setval(pg_get_serial_sequence('public.company','id'),           coalesce((select max(id) from public.company),1));
   select setval(pg_get_serial_sequence('public.customers','id'),         coalesce((select max(id) from public.customers),1));
   select setval(pg_get_serial_sequence('public.products','id'),          coalesce((select max(id) from public.products),1));
   select setval(pg_get_serial_sequence('public.purchase_invoices','id'), coalesce((select max(id) from public.purchase_invoices),1));
   select setval(pg_get_serial_sequence('public.purchase_orders','id'),   coalesce((select max(id) from public.purchase_orders),1));
   select setval(pg_get_serial_sequence('public.sale_invoices','id'),     coalesce((select max(id) from public.sale_invoices),1));
   select setval(pg_get_serial_sequence('public.sales_orders','id'),      coalesce((select max(id) from public.sales_orders),1));
   select setval(pg_get_serial_sequence('public.stock','id'),             coalesce((select max(id) from public.stock),1));
   select setval(pg_get_serial_sequence('public.stock_movements','id'),   coalesce((select max(id) from public.stock_movements),1));
   select setval(pg_get_serial_sequence('public.vendors','id'),           coalesce((select max(id) from public.vendors),1));
   select setval(pg_get_serial_sequence('public.warehouses','id'),        coalesce((select max(id) from public.warehouses),1));
   -- the loom app's revision counter: a value lower than existing revisions breaks its sync
   select setval('public.skt_rev', coalesce((select max(rev) from public.skt_kv), 1));
   ```
5. **Point the app at the new project.** Update `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the public keys in Vercel
   and in the GitHub secrets, then redeploy.
6. **Re-create what was left out on purpose.**
   - **Loom app (`skt_*`)**: its functions reject every call until its secret hash exists. Insert the hash of the access
     code you use (replace the placeholder with the real code; do not paste a real code into a shared chat or ticket):
     ```sql
     insert into public.skt_secret (id, h) values (1, encode(sha256(convert_to('YOUR-ACCESS-CODE','utf8')),'hex'))
       on conflict (id) do update set h = excluded.h;
     ```
   - **Licence keys**: re-issue or re-enter them from your payment records.
   - **PINs**: each user sets their app lock again.
7. **Users.** Passwords are never exported, and `auth.users` is not restored automatically. People sign in again with
   Google or a one-time code. Their data is keyed by their old user id, so to keep access to it the new accounts should
   be created **with the original ids** from the backup's user list (`npm run backup:restore -- <file> --identity-file
   <key> --out users-and-data.json`, then use the `authUsers` array; **delete that plaintext file afterwards**). This step
   has **not been tested** against a real project, so do it on the new project before pointing real users at it, and
   confirm one user can see their ledger.

### D. This repository, or Node, is gone

The files are standard [age](https://age-encryption.org) files. With the stock `age` tool and a private key file:

```bash
age -d -i rupeeledger-backup-key.txt rupeeledger-<time>.json.gz.age | gunzip > backup.json
```

`backup.json` is plain JSON: `tables.<name>.rows` holds the rows, `schema.ddl` holds the schema SQL. That is plaintext
business data, so keep it off shared drives and delete it when finished.

## Keys

- **Lost private key:** the backups cannot be opened. Make a new pair now and replace `BACKUP_AGE_RECIPIENT`; new
  backups will use it. This is why the key has two copies.
- **Rotating:** generate a new pair, replace `BACKUP_AGE_RECIPIENT`, and **keep the old private key** for as long as
  old backups exist. Old backups still need the old key.
- **Suspected leak of the private key:** rotate as above. Anyone holding both the key and an old backup file can read
  that backup, so treat the old files accordingly (delete them if you no longer need them).
- **Suspected leak of the service-role key or bucket key:** rotate in Supabase / the bucket provider and update the
  secrets. Neither is stored anywhere except GitHub's encrypted secrets.

## What stops a bad backup from looking like a good one

The job fails (and writes nothing) rather than producing a quietly incomplete file when:

- the database has a table that is neither backed up nor explicitly excluded (a new table cannot be silently missed);
- any table's rows received do not match its exact row count taken before and after reading;
- any value looks like a live credential (a JWT, a payment-provider secret, a private key, ...). The log names the table,
  row and column, never the value;
- the destination is missing or the upload fails.

## What has and has not been verified

**Verified**

| What | How |
|---|---|
| Encryption round-trip; wrong key, flipped byte and truncation all fail loudly | Unit tests |
| Complete reads: paging past 1000 rows, a server that silently caps responses, a response that stops early, a table changing mid-read | Unit tests, plus the real adapter over a fake HTTP server modelling PostgREST |
| Every table in production is classified (29 of 29), credential tables are never even requested | Test against the real table list |
| Credentials never enter a backup: excluded tables, redacted columns, token scan, user whitelist | Unit tests; each safety check was also **deliberately broken** to confirm a test fails |
| Restore only adds missing rows, never deletes, never reverts newer edits, never touches excluded columns | Unit tests |
| **The schema function ran on the real production database** (as a temporary, never-saved function) and its output matches independently counted objects: 29 tables, 11 policies, 8 functions, 15 + 12 indexes, 4 extensions | Run through the Supabase tooling |
| **The real 40 KB production schema rebuilds into an empty Postgres with no errors, re-running it changes nothing, and regenerating it from the rebuild gives identical output (0 of 848 lines differ)** | PGlite (PostgreSQL 18 in-process) with only `auth.uid()`, the three API roles and platform extensions stubbed |
| The workflow's shell steps: missing secrets, private key in the wrong slot, no file, two files, monthly copy on the 1st, healthcheck ping and failure | Executed locally with fake `aws` and `curl` |
| Export, daily snapshot, cloud snapshot, Import and Restore carry or read no licence key or PIN | Tests that fail if it is reintroduced; behaviour checked in the browser |

**Not verified, so treat as unproven until you have done it**

| What | Why |
|---|---|
| A real backup run against production Supabase | No service-role key is available on the development machine. **Your first run is the first real test.** |
| The GitHub Actions run itself | Scheduled and manual runs only work from `main`, after merge |
| Upload to R2 / B2 with real credentials | No bucket exists yet |
| The healthchecks.io ping | No account |
| Reading the real user list through Supabase's admin API | Tested against a fake server only; the real response shape is unconfirmed |
| `restore --diff` and `--apply` against a real Supabase project (in particular the upsert write path) | Tested against stubs and a fake HTTP server only |
| Re-creating users with their original ids | Described above, never attempted |
| The schema rebuilt on Supabase's own Postgres 17 | Tested on Postgres 18 |
| Migration 0004 on the production database | Not applied. It is a file in the repository awaiting your approval |

**First-run checklist:** run the workflow once, open the file's manifest in the bucket (counts should match what you
expect: roughly 1,019 transactions and 730 `skt_kv` rows as of 2026-11-06), then do the restore drill in step 6.
