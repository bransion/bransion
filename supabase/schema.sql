-- =====================================================================
-- BRANSION — Database Schema
-- Run this ONCE in Supabase → SQL Editor → New Query → Run
-- =====================================================================
-- ⚠️ SAFE TO RE-RUN: everything uses IF NOT EXISTS or CREATE OR REPLACE.
--    Re-running will NOT delete data. It just ensures the schema exists.
-- =====================================================================

-- Enable UUID generation (Supabase has this on by default, but just in case)
create extension if not exists "pgcrypto";

-- =====================================================================
-- SECTION 1 — TABLES
-- =====================================================================

-- ── 1. profiles ───────────────────────────────────────────────────────
-- One row per Google user. Mirrors auth.users. Auto-created by trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer','creator','admin')),
  tier text not null default 'none' check (tier in ('none','basic','standard','premium')),
  tier_paid_at timestamptz,
  wallet_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  lifetime_earnings numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. brands ─────────────────────────────────────────────────────────
-- Creator's brand/storefront. Image editable anytime; name/desc editable.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  logo_url text,
  is_active boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_brands_creator on public.brands(creator_id);

-- ── 3. plain_apparel ──────────────────────────────────────────────────
-- Bransion's blank catalog (t-shirts, hoodies, etc.). Admin-managed.
create table if not exists public.plain_apparel (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('tshirt','hoodie','cap','mug','other')),
  color_name text,
  color_hex text,
  image_url text,
  base_medium_price numeric(14,2) not null check (base_medium_price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 4. size_pricing ───────────────────────────────────────────────────
-- Per-size price overrides. Editable by admin (prices change over time).
create table if not exists public.size_pricing (
  id uuid primary key default gen_random_uuid(),
  apparel_id uuid not null references public.plain_apparel(id) on delete cascade,
  size text not null check (size in (
    '2XS','XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','8XL','9XL','10XL'
  )),
  price numeric(14,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apparel_id, size)
);

-- ── 5. products ───────────────────────────────────────────────────────
-- Creator's designed product. design_url is IMMUTABLE once set.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  apparel_id uuid not null references public.plain_apparel(id),
  name text not null,
  description text,
  design_url text not null,
  creator_markup numeric(14,2) not null check (creator_markup >= 0),
  status text not null default 'draft' check (status in ('draft','live','archived')),
  slug text not null unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_status on public.products(status);

-- ── 6. orders ─────────────────────────────────────────────────────────
-- Once status = 'paid', cannot be reversed (enforced by trigger below).
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  brand_id uuid not null references public.brands(id),
  status text not null default 'pending_payment' check (status in (
    'pending_payment','paid','fulfilled','cancelled','refunded'
  )),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  delivery_fee numeric(14,2) not null default 0 check (delivery_fee >= 0),
  payment_reference text unique,
  paid_at timestamptz,
  shipping_full_name text not null,
  shipping_primary_phone text not null,
  shipping_secondary_phone text,
  shipping_current_address text not null,
  shipping_address text not null,
  shipping_state text not null,
  shipping_lga text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_brand on public.orders(brand_id);
create index if not exists idx_orders_status on public.orders(status);

-- ── 7. order_items ────────────────────────────────────────────────────
-- Prices snapshotted at purchase time (so future price edits don't rewrite history).
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  size text not null,
  size_price numeric(14,2) not null check (size_price >= 0),
  markup numeric(14,2) not null check (markup >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ── 8. wallet_transactions ────────────────────────────────────────────
-- Ledger. Debits are negative. balance_after = running balance snapshot.
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id),
  type text not null check (type in ('sale_credit','withdrawal','maintenance_fee','adjustment')),
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  description text,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wallet_tx_creator on public.wallet_transactions(creator_id);

-- ── 9. maintenance_invoices ───────────────────────────────────────────
-- One per creator per month. Auto-deducted from wallet if balance suffices.
create table if not exists public.maintenance_invoices (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('basic','standard','premium')),
  amount numeric(14,2) not null check (amount >= 0),
  billing_month date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid','waived')),
  paid_at timestamptz,
  paid_via text check (paid_via in ('wallet_auto','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, billing_month)
);
create index if not exists idx_invoices_creator_status on public.maintenance_invoices(creator_id, status);

-- ── 10. withdrawal_requests ───────────────────────────────────────────
-- Creator requests money out. Admin approves in /admin/finance.
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  bank_full_name text not null,
  account_number text not null,
  bank_name text not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_withdrawals_creator on public.withdrawal_requests(creator_id);
create index if not exists idx_withdrawals_status on public.withdrawal_requests(status);

-- ── 11. subscription_payments ─────────────────────────────────────────
-- One-time tier purchase records.
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('basic','standard','premium')),
  amount numeric(14,2) not null check (amount >= 0),
  payment_reference text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 12. admin_audit_log ───────────────────────────────────────────────
-- Append-only audit trail. Admin reads, no one updates/deletes.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_admin on public.admin_audit_log(admin_id);
create index if not exists idx_audit_created on public.admin_audit_log(created_at desc);

-- =====================================================================
-- SECTION 2 — HELPER FUNCTIONS
-- =====================================================================

-- Is the current user an admin? (Queries their own profile row.)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-maintain updated_at column.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Slot check for brands. Used by INSERT policy on brands.
-- Basic=1, Standard=5, Premium=unlimited. Returns false if tier='none'.
create or replace function public.creator_can_add_brand(p_creator_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_tier text;
  v_count int;
  v_limit int;
begin
  select tier into v_tier from public.profiles where id = p_creator_id;
  if v_tier is null or v_tier = 'none' then
    return false;
  end if;
  select count(*) into v_count from public.brands where creator_id = p_creator_id;
  v_limit := case v_tier
    when 'basic' then 1
    when 'standard' then 5
    when 'premium' then 2147483647
    else 0
  end;
  return v_count < v_limit;
end;
$$;

-- ATOMIC: pays oldest unpaid maintenance invoices from a sale credit,
-- then credits the remainder to wallet_balance and logs transactions.
-- Called by server when a sale is confirmed (Phase 5).
create or replace function public.apply_maintenance_offset(
  p_creator_id uuid,
  p_credit_amount numeric
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_remaining numeric := p_credit_amount;
  v_invoice record;
  v_new_balance numeric;
begin
  -- 1) Pay oldest unpaid invoices first
  for v_invoice in
    select * from public.maintenance_invoices
    where creator_id = p_creator_id and status = 'unpaid'
    order by billing_month asc
  loop
    exit when v_remaining < v_invoice.amount;

    update public.maintenance_invoices
    set status = 'paid', paid_at = now(), paid_via = 'wallet_auto'
    where id = v_invoice.id;

    v_remaining := v_remaining - v_invoice.amount;

    insert into public.wallet_transactions
      (creator_id, type, amount, balance_after, description, reference)
    values
      (p_creator_id, 'maintenance_fee', -v_invoice.amount, 0,
       'Auto-paid invoice ' || v_invoice.billing_month,
       'maint_' || v_invoice.id);
  end loop;

  -- 2) Credit remainder to wallet
  if v_remaining > 0 then
    update public.profiles
    set wallet_balance = wallet_balance + v_remaining,
        lifetime_earnings = lifetime_earnings + p_credit_amount
    where id = p_creator_id
    returning wallet_balance into v_new_balance;

    insert into public.wallet_transactions
      (creator_id, type, amount, balance_after, description)
    values
      (p_creator_id, 'sale_credit', v_remaining, v_new_balance,
       'Sale credit after maintenance offset');
  end if;

  return v_remaining;
end;
$$;

-- =====================================================================
-- SECTION 3 — TRIGGERS
-- =====================================================================

-- New Google user → auto-create profile row (role='buyer').
-- Admin promotion happens in /auth/callback server route based on ADMIN_EMAIL env.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    'buyer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at auto-update
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_brands_updated on public.brands;
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

drop trigger if exists trg_apparel_updated on public.plain_apparel;
create trigger trg_apparel_updated before update on public.plain_apparel
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sizepricing_updated on public.size_pricing;
create trigger trg_sizepricing_updated before update on public.size_pricing
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_order_items_updated on public.order_items;
create trigger trg_order_items_updated before update on public.order_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wallet_tx_updated on public.wallet_transactions;
create trigger trg_wallet_tx_updated before update on public.wallet_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated on public.maintenance_invoices;
create trigger trg_invoices_updated before update on public.maintenance_invoices
  for each row execute function public.set_updated_at();

drop trigger if exists trg_withdrawals_updated on public.withdrawal_requests;
create trigger trg_withdrawals_updated before update on public.withdrawal_requests
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated on public.subscription_payments;
create trigger trg_subscriptions_updated before update on public.subscription_payments
  for each row execute function public.set_updated_at();

-- Prevent profile users from modifying sensitive fields (role, tier, balances).
create or replace function public.prevent_profile_sensitive_update() returns trigger
language plpgsql as $$
begin
  -- Service role and direct SQL (auth.uid() is null) → allow.
  -- Admins → allow.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.tier is distinct from old.tier
     or new.tier_paid_at is distinct from old.tier_paid_at
     or new.wallet_balance is distinct from old.wallet_balance
     or new.pending_balance is distinct from old.pending_balance
     or new.lifetime_earnings is distinct from old.lifetime_earnings
  then
    raise exception 'Cannot modify sensitive profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.prevent_profile_sensitive_update();

-- Product design_url is IMMUTABLE after creation. Even admins can't change it.
create or replace function public.prevent_product_image_change() returns trigger
language plpgsql as $$
begin
  if old.design_url is distinct from new.design_url then
    raise exception 'Product image is permanent. Buy a new brand slot to publish a new design.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_image_guard on public.products;
create trigger trg_products_image_guard before update on public.products
  for each row execute function public.prevent_product_image_change();

-- Paid orders are sacred — no reversal to pending_payment/cancelled/refunded.
create or replace function public.prevent_paid_order_reversal() returns trigger
language plpgsql as $$
begin
  if old.status = 'paid' and new.status in ('pending_payment','cancelled','refunded') then
    raise exception 'Paid orders cannot be reversed. Handle refunds off-platform via WhatsApp.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_reversal_guard on public.orders;
create trigger trg_orders_reversal_guard before update on public.orders
  for each row execute function public.prevent_paid_order_reversal();

-- =====================================================================
-- SECTION 4 — ENABLE ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.brands                enable row level security;
alter table public.plain_apparel         enable row level security;
alter table public.size_pricing          enable row level security;
alter table public.products              enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.wallet_transactions   enable row level security;
alter table public.maintenance_invoices  enable row level security;
alter table public.withdrawal_requests   enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.admin_audit_log       enable row level security;

-- =====================================================================
-- SECTION 5 — POLICIES
-- =====================================================================

-- ── profiles ──
drop policy if exists "profiles: user reads own" on public.profiles;
create policy "profiles: user reads own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: admin reads all" on public.profiles;
create policy "profiles: admin reads all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles: user updates own" on public.profiles;
create policy "profiles: user updates own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No INSERT policy → only service_role (trigger) can insert profiles.
-- No DELETE policy → never deletable.

-- ── brands ──
drop policy if exists "brands: public read active" on public.brands;
create policy "brands: public read active" on public.brands
  for select using (is_active = true or creator_id = auth.uid() or public.is_admin());

drop policy if exists "brands: creator insert within tier" on public.brands;
create policy "brands: creator insert within tier" on public.brands
  for insert with check (
    auth.uid() = creator_id and public.creator_can_add_brand(auth.uid())
  );

drop policy if exists "brands: creator update own" on public.brands;
create policy "brands: creator update own" on public.brands
  for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists "brands: creator delete own" on public.brands;
create policy "brands: creator delete own" on public.brands
  for delete using (auth.uid() = creator_id or public.is_admin());

-- ── plain_apparel ──
drop policy if exists "apparel: public read active" on public.plain_apparel;
create policy "apparel: public read active" on public.plain_apparel
  for select using (is_active = true or public.is_admin());

drop policy if exists "apparel: admin insert" on public.plain_apparel;
create policy "apparel: admin insert" on public.plain_apparel
  for insert with check (public.is_admin());

drop policy if exists "apparel: admin update" on public.plain_apparel;
create policy "apparel: admin update" on public.plain_apparel
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "apparel: admin delete" on public.plain_apparel;
create policy "apparel: admin delete" on public.plain_apparel
  for delete using (public.is_admin());

-- ── size_pricing ──
drop policy if exists "size_pricing: public read" on public.size_pricing;
create policy "size_pricing: public read" on public.size_pricing
  for select using (true);

drop policy if exists "size_pricing: admin write" on public.size_pricing;
create policy "size_pricing: admin write" on public.size_pricing
  for all using (public.is_admin()) with check (public.is_admin());

-- ── products ──
drop policy if exists "products: public read live" on public.products;
create policy "products: public read live" on public.products
  for select using (
    status = 'live'
    or public.is_admin()
    or exists (select 1 from public.brands b where b.id = products.brand_id and b.creator_id = auth.uid())
  );

drop policy if exists "products: creator insert own brand" on public.products;
create policy "products: creator insert own brand" on public.products
  for insert with check (
    exists (select 1 from public.brands b where b.id = products.brand_id and b.creator_id = auth.uid())
  );

drop policy if exists "products: creator update own" on public.products;
create policy "products: creator update own" on public.products
  for update using (
    exists (select 1 from public.brands b where b.id = products.brand_id and b.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.brands b where b.id = products.brand_id and b.creator_id = auth.uid())
  );

drop policy if exists "products: creator delete own" on public.products;
create policy "products: creator delete own" on public.products
  for delete using (
    exists (select 1 from public.brands b where b.id = products.brand_id and b.creator_id = auth.uid())
    or public.is_admin()
  );

-- ── orders ──
drop policy if exists "orders: buyer read own" on public.orders;
create policy "orders: buyer read own" on public.orders
  for select using (auth.uid() = buyer_id);

drop policy if exists "orders: creator read their products' orders" on public.orders;
create policy "orders: creator read their products' orders" on public.orders
  for select using (
    exists (
      select 1 from public.order_items oi
      join public.products p on p.id = oi.product_id
      join public.brands b on b.id = p.brand_id
      where oi.order_id = orders.id and b.creator_id = auth.uid()
    )
  );

drop policy if exists "orders: admin read all" on public.orders;
create policy "orders: admin read all" on public.orders
  for select using (public.is_admin());

-- No INSERT/UPDATE/DELETE policy → server-only via service_role.

-- ── order_items ──
drop policy if exists "order_items: buyer read own" on public.order_items;
create policy "order_items: buyer read own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = auth.uid())
  );

drop policy if exists "order_items: creator read own" on public.order_items;
create policy "order_items: creator read own" on public.order_items
  for select using (
    exists (
      select 1 from public.products p
      join public.brands b on b.id = p.brand_id
      where p.id = order_items.product_id and b.creator_id = auth.uid()
    )
  );

drop policy if exists "order_items: admin read all" on public.order_items;
create policy "order_items: admin read all" on public.order_items
  for select using (public.is_admin());

-- ── wallet_transactions ──
drop policy if exists "wallet_tx: creator read own" on public.wallet_transactions;
create policy "wallet_tx: creator read own" on public.wallet_transactions
  for select using (auth.uid() = creator_id);

drop policy if exists "wallet_tx: admin read all" on public.wallet_transactions;
create policy "wallet_tx: admin read all" on public.wallet_transactions
  for select using (public.is_admin());

-- ── maintenance_invoices ──
drop policy if exists "invoices: creator read own" on public.maintenance_invoices;
create policy "invoices: creator read own" on public.maintenance_invoices
  for select using (auth.uid() = creator_id);

drop policy if exists "invoices: admin read all" on public.maintenance_invoices;
create policy "invoices: admin read all" on public.maintenance_invoices
  for select using (public.is_admin());

-- ── withdrawal_requests ──
drop policy if exists "withdrawals: creator read own" on public.withdrawal_requests;
create policy "withdrawals: creator read own" on public.withdrawal_requests
  for select using (auth.uid() = creator_id);

drop policy if exists "withdrawals: creator insert own pending" on public.withdrawal_requests;
create policy "withdrawals: creator insert own pending" on public.withdrawal_requests
  for insert with check (
    auth.uid() = creator_id and status = 'pending' and amount > 0
  );

drop policy if exists "withdrawals: admin read all" on public.withdrawal_requests;
create policy "withdrawals: admin read all" on public.withdrawal_requests
  for select using (public.is_admin());

-- ── subscription_payments ──
drop policy if exists "subscriptions: creator read own" on public.subscription_payments;
create policy "subscriptions: creator read own" on public.subscription_payments
  for select using (auth.uid() = creator_id);

drop policy if exists "subscriptions: admin read all" on public.subscription_payments;
create policy "subscriptions: admin read all" on public.subscription_payments
  for select using (public.is_admin());

-- ── admin_audit_log ──
drop policy if exists "audit: admin read all" on public.admin_audit_log;
create policy "audit: admin read all" on public.admin_audit_log
  for select using (public.is_admin());

-- =====================================================================
-- SECTION 6 — BACKFILL existing users (safe if you signed in before running this)
-- =====================================================================
insert into public.profiles (id, email, full_name, avatar_url, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1)),
  au.raw_user_meta_data->>'avatar_url',
  'buyer'
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;

-- =====================================================================
-- DONE. 12 tables + RLS + triggers + helper functions installed.
-- =====================================================================