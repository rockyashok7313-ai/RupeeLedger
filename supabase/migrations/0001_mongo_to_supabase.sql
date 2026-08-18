-- Migration: MongoDB -> Supabase
--
-- Creates the tables that previously lived only as MongoDB collections.
-- The ledger tables (accounts, transactions, business_profiles, subscriptions,
-- security_settings, clients, inventory, invoices, expenses,
-- recurring_templates, receipts) already exist and are untouched here.

-- ---------------------------------------------------------------------------
-- 1. Licence keys  (was: collection 'keys')
-- ---------------------------------------------------------------------------
create table if not exists public.keys (
  key             text primary key,
  duration_days   integer     not null default 30,
  status          text        not null default 'unused',
  created_at      bigint,
  created_by      text,
  used_by         text,
  used_at         bigint,
  used_on_device  text,
  payment_id      text
);

create index if not exists keys_created_by_idx on public.keys (created_by);
create unique index if not exists keys_payment_id_idx on public.keys (payment_id) where payment_id is not null;

-- ---------------------------------------------------------------------------
-- 2. OTP store  (was: collection 'otps' with a TTL index)
--    Postgres has no TTL index; expiry is enforced in application code and the
--    optional cleanup below.
-- ---------------------------------------------------------------------------
create table if not exists public.otps (
  identifier    text primary key,
  otp           text        not null,
  expires_at    timestamptz not null,
  attempts      integer     not null default 0,
  last_sent_at  timestamptz not null default now()
);

create index if not exists otps_expires_at_idx on public.otps (expires_at);

-- ---------------------------------------------------------------------------
-- 3. Rate limits  (was: collection 'rate_limits' with a TTL index)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  id        text primary key,
  count     integer     not null default 0,
  reset_at  timestamptz not null
);

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- ---------------------------------------------------------------------------
-- 4. ERP master data
-- ---------------------------------------------------------------------------
create table if not exists public.company (
  id            bigserial primary key,
  user_id       text not null,
  company_id    text,
  company_name  text,
  address       text,
  state         text,
  gst_number    text,
  pan_number    text,
  cin_number    text,
  contact_email text,
  contact_phone text,
  bank_details  text,
  created_date  bigint,
  updated_date  bigint,
  unique (user_id, company_id)
);

create table if not exists public.vendors (
  id             bigserial primary key,
  user_id        text not null,
  vendor_id      text,
  vendor_name    text,
  address        text,
  city           text,
  state          text,
  pincode        text,
  gst_number     text,
  pan_number     text,
  contact_person text,
  email          text,
  phone          text,
  bank_account   text,
  bank_ifsc      text,
  payment_terms  text,
  created_date   bigint,
  updated_date   bigint,
  unique (user_id, vendor_id)
);

create table if not exists public.customers (
  id             bigserial primary key,
  user_id        text not null,
  customer_id    text,
  customer_name  text,
  address        text,
  city           text,
  state          text,
  pincode        text,
  gst_number     text,
  pan_number     text,
  contact_person text,
  email          text,
  phone          text,
  credit_limit   numeric,
  payment_terms  text,
  created_date   bigint,
  updated_date   bigint,
  unique (user_id, customer_id)
);

create table if not exists public.products (
  id              bigserial primary key,
  user_id         text not null,
  product_id      text,
  product_name    text,
  hsn_code        text,
  sac_code        text,
  description     text,
  unit_of_measure text,
  hsn_gst_rate    numeric,
  purchase_price  numeric,
  selling_price   numeric,
  reorder_level   numeric,
  created_date    bigint,
  updated_date    bigint,
  unique (user_id, product_id)
);

create table if not exists public.warehouses (
  id             bigserial primary key,
  user_id        text not null,
  warehouse_id   text,
  warehouse_name text,
  address        text,
  warehouse_type text,
  created_date   bigint,
  updated_date   bigint,
  unique (user_id, warehouse_id)
);

-- ---------------------------------------------------------------------------
-- 5. ERP transactions.  Line items stay as jsonb, matching the nested arrays
--    the documents used in MongoDB.
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id                   bigserial primary key,
  user_id              text not null,
  po_id                text,
  po_date              bigint,
  vendor_id            text,
  delivery_date        bigint,
  delivery_address     text,
  po_status            text,
  notes                text,
  lines                jsonb default '[]'::jsonb,
  po_total_before_tax  numeric,
  po_cgst_total        numeric,
  po_sgst_total        numeric,
  po_igst_total        numeric,
  po_grand_total       numeric,
  created_date         bigint,
  created_by           text,
  updated_date         bigint,
  unique (user_id, po_id)
);

create table if not exists public.purchase_invoices (
  id                  bigserial primary key,
  user_id             text not null,
  purchase_inv_id     text,
  purchase_inv_date   bigint,
  vendor_id           text,
  po_id               text,
  invoice_number      text,
  invoice_date        bigint,
  delivery_date       bigint,
  warehouse_id        text,
  payment_status      text,
  lines               jsonb default '[]'::jsonb,
  gross_amount        numeric,
  discount_amount     numeric,
  cgst_total          numeric,
  sgst_total          numeric,
  igst_total          numeric,
  net_tax_amount      numeric,
  net_invoice_amount  numeric,
  received_quantity   numeric,
  rejected_quantity   numeric,
  pending_quantity    numeric,
  remarks             text,
  created_date        bigint,
  created_by          text,
  updated_date        bigint,
  unique (user_id, purchase_inv_id)
);

create table if not exists public.sales_orders (
  id                   bigserial primary key,
  user_id              text not null,
  so_id                text,
  so_date              bigint,
  customer_id          text,
  delivery_date        bigint,
  delivery_address     text,
  so_status            text,
  lines                jsonb default '[]'::jsonb,
  so_total_before_tax  numeric,
  so_cgst_total        numeric,
  so_sgst_total        numeric,
  so_igst_total        numeric,
  so_grand_total       numeric,
  notes                text,
  created_date         bigint,
  created_by           text,
  updated_date         bigint,
  unique (user_id, so_id)
);

create table if not exists public.sale_invoices (
  id                  bigserial primary key,
  user_id             text not null,
  sale_inv_id         text,
  sale_inv_date       bigint,
  customer_id         text,
  so_id               text,
  bill_number         text,
  delivery_date       bigint,
  payment_status      text,
  payment_terms       text,
  lines               jsonb default '[]'::jsonb,
  gross_amount        numeric,
  discount_total      numeric,
  cgst_total          numeric,
  sgst_total          numeric,
  igst_total          numeric,
  net_tax_amount      numeric,
  net_invoice_amount  numeric,
  amount_paid         numeric,
  amount_due          numeric,
  notes               text,
  created_date        bigint,
  created_by          text,
  updated_date        bigint,
  unique (user_id, sale_inv_id)
);

-- ---------------------------------------------------------------------------
-- 6. Inventory: movement journal plus the running per-warehouse summary
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id             bigserial primary key,
  user_id        text not null,
  movement_id    text,
  product_id     text,
  warehouse_id   text,
  movement_type  text,
  quantity       numeric,
  reference_id   text,
  notes          text,
  date           bigint,
  created_date   bigint,
  unique (user_id, movement_id)
);

create index if not exists stock_movements_user_date_idx on public.stock_movements (user_id, date desc);

create table if not exists public.stock (
  id                bigserial primary key,
  user_id           text not null,
  product_id        text not null,
  warehouse_id      text not null,
  quantity_on_hand  numeric not null default 0,
  updated_date      bigint,
  unique (user_id, product_id, warehouse_id)
);

-- Atomic stock adjustment. Replaces MongoDB's `$inc` with upsert, so concurrent
-- movements cannot lose an update through a read-modify-write race.
create or replace function public.adjust_stock_on_hand(
  p_user_id      text,
  p_product_id   text,
  p_warehouse_id text,
  p_qty_change   numeric
) returns void
language sql
as $$
  insert into public.stock (user_id, product_id, warehouse_id, quantity_on_hand, updated_date)
  values (
    p_user_id,
    p_product_id,
    p_warehouse_id,
    p_qty_change,
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (user_id, product_id, warehouse_id)
  do update set
    quantity_on_hand = public.stock.quantity_on_hand + excluded.quantity_on_hand,
    updated_date     = excluded.updated_date;
$$;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
--
-- Every table above is reached only through the API routes, which authenticate
-- the caller and then use the service-role key. Enabling RLS with no policy
-- therefore blocks all direct anon/browser access while leaving the server
-- routes working.
-- ---------------------------------------------------------------------------
alter table public.keys              enable row level security;
alter table public.otps              enable row level security;
alter table public.rate_limits       enable row level security;
alter table public.company           enable row level security;
alter table public.vendors           enable row level security;
alter table public.customers         enable row level security;
alter table public.products          enable row level security;
alter table public.warehouses        enable row level security;
alter table public.purchase_orders   enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.sales_orders      enable row level security;
alter table public.sale_invoices     enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.stock             enable row level security;

-- ---------------------------------------------------------------------------
-- 8. Optional housekeeping: the two tables that relied on a MongoDB TTL index.
--    Expiry is already enforced in application code; this just reclaims rows.
--    Schedule with pg_cron if available.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_auth_rows()
returns void
language sql
as $$
  delete from public.otps where expires_at < now();
  delete from public.rate_limits where reset_at < now();
$$;
