-- Dated ledger snapshots.
--
-- The existing auto-backup keeps a single slot in localStorage, overwritten
-- once a day. That is no help in the two cases that matter: a browser whose
-- storage is cleared, and a problem noticed a day late -- by then the only
-- copy has already been overwritten with the bad data.
--
-- This keeps one snapshot per owner, per branch, per day on the server, so a
-- ledger can be rolled back to a chosen date rather than to "whatever the last
-- write happened to be".

create table if not exists public.ledger_backups (
  id                bigserial primary key,
  user_id           text        not null,
  "branchId"        text        not null default 'hq',
  taken_on          date        not null,
  created_at        timestamptz not null default now(),
  payload           jsonb       not null,
  account_count     integer     not null default 0,
  transaction_count integer     not null default 0,
  byte_size         integer     not null default 0,
  -- One row per day. A second snapshot the same day replaces the first, so a
  -- busy day cannot crowd out the older dates that are the point of this table.
  unique (user_id, "branchId", taken_on)
);

create index if not exists ledger_backups_owner_date_idx
  on public.ledger_backups (user_id, "branchId", taken_on desc);

-- Reached only through /api/ledger/backup, which authenticates the caller and
-- uses the service-role key. RLS on with no policy denies anon and
-- authenticated alike while leaving the server route working -- same posture as
-- the other server-only tables in 0002.
alter table public.ledger_backups enable row level security;

revoke all on public.ledger_backups from anon;

/**
 * Trims a ledger's snapshot history to the most recent `p_keep` days.
 * Called after each snapshot so the table cannot grow without bound.
 */
create or replace function public.prune_ledger_backups(
  p_user_id   text,
  p_branch_id text,
  p_keep      integer default 14
) returns integer
language plpgsql
as $$
declare
  removed integer;
begin
  with doomed as (
    select id from public.ledger_backups
    where user_id = p_user_id and "branchId" = p_branch_id
    order by taken_on desc
    offset greatest(p_keep, 1)
  )
  delete from public.ledger_backups b using doomed d where b.id = d.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
