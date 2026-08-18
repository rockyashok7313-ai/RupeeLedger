-- Row Level Security policies
--
-- CONTEXT -- read before changing these.
--
-- This app has two classes of user, and only one of them has a Supabase
-- identity:
--
--   1. Supabase Auth users -- email/password and Google OAuth. These carry a
--      real session, so auth.uid() is populated.
--   2. Custom-token users -- phone OTP, WhatsApp OTP, email OTP. App.tsx issues
--      an HMAC token into localStorage ("rupee_ledger_token") and getAuthToken()
--      PREFERS it over any Supabase session. For these users auth.uid() is NULL.
--
-- Legacy rows compound this: the account that owns every ledger record
-- (GnUOoUMscDO0kgbGlR5roZDwpSB3) is a Firebase-era uid that matches no row in
-- auth.users. A policy keyed on auth.uid() cannot ever match it.
--
-- So these policies deliberately do NOT try to be the only line of defence:
--
--   * anon        -- no policy at all. The anon key ships inside the public JS
--                    bundle, so granting it row access would let anyone read or
--                    write every user's ledger. It stays denied.
--   * authenticated -- may touch only its own rows, matched on auth.uid().
--                    This is what makes src/lib/supabaseSync.ts work directly.
--   * service_role -- bypasses RLS entirely. This is the path the API routes in
--                    backend/routes/ use, and it is the ONLY path that works for
--                    custom-token and legacy users. Those routes authenticate
--                    the caller and check ownership themselves before touching
--                    a row.
--
-- Consequence: users without a Supabase session cannot sync directly from the
-- browser and must go through /api/ledger/sync. That is by design -- there is no
-- way to authenticate them at the database level without trusting a
-- client-supplied user id, which the public anon key makes forgeable.

-- ---------------------------------------------------------------------------
-- Ledger + GST tables: one row set per owner
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'transactions', 'clients', 'inventory', 'invoices',
    'expenses', 'recurring_templates', 'receipts',
    'business_profiles', 'subscriptions', 'security_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Recreate idempotently so this migration can be re-run.
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);

    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (auth.uid()::text = user_id)
        with check (auth.uid()::text = user_id)
    $f$, t || '_owner_all', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Server-only tables.
--
-- keys, otps and rate_limits are security machinery: licence activation, OTP
-- verification and abuse throttling. ERP tables are reached only through
-- backend/routes/erp/*. None of them should ever be readable from a browser, so
-- RLS stays on with no policy -- deny-all to anon and authenticated alike, while
-- service_role continues to bypass.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'keys', 'otps', 'rate_limits',
    'company', 'vendors', 'customers', 'products', 'warehouses',
    'purchase_orders', 'purchase_invoices', 'sales_orders', 'sale_invoices',
    'stock', 'stock_movements'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Belt and braces: the anon role should not hold table grants either, so a
-- future accidental "allow all" policy still cannot expose these tables.
-- ---------------------------------------------------------------------------
revoke all on public.keys, public.otps, public.rate_limits from anon;
revoke all on public.company, public.vendors, public.customers,
  public.products, public.warehouses from anon;
revoke all on public.purchase_orders, public.purchase_invoices,
  public.sales_orders, public.sale_invoices from anon;
revoke all on public.stock, public.stock_movements from anon;
