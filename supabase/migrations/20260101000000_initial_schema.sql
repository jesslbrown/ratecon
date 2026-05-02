-- =============================================================================
-- RateCon initial schema
--
-- Five tables (profiles, brokers, loads, invoices, subscriptions) plus a
-- stripe_events deduplication table for idempotent webhook processing.
--
-- All user-data tables enforce row-level security so users only ever see
-- their own records. The service-role key is used only by trusted server
-- code (webhooks).
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type language_preference as enum ('en', 'pa', 'hi', 'ur');
create type currency_code as enum ('CAD', 'USD');
create type load_status as enum ('draft', 'invoiced', 'paid', 'overdue');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
create type subscription_plan as enum ('solo', 'plus');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  gst_hst_number text,
  mc_number text,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  country text default 'CA',
  phone text,
  language_preference language_preference not null default 'en',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- brokers
-- -----------------------------------------------------------------------------
create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mc_number text,
  ap_email text,
  phone text,
  payment_terms_days integer not null default 30,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  country text default 'US',
  created_at timestamptz not null default now()
);

create index brokers_user_id_idx on public.brokers (user_id);
create index brokers_name_idx on public.brokers (user_id, lower(name));

-- -----------------------------------------------------------------------------
-- loads
-- -----------------------------------------------------------------------------
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_id uuid references public.brokers(id) on delete set null,
  load_number text,
  pickup_date date,
  pickup_address_line1 text,
  pickup_city text,
  pickup_province text,
  pickup_postal_code text,
  pickup_country text default 'CA',
  delivery_date date,
  delivery_address_line1 text,
  delivery_city text,
  delivery_province text,
  delivery_postal_code text,
  delivery_country text default 'CA',
  distance_miles numeric(10,2),
  equipment_type text,
  line_haul_rate numeric(12,2),
  fuel_surcharge numeric(12,2) default 0,
  accessorials jsonb not null default '[]'::jsonb,
  total_rate numeric(12,2),
  payment_terms_days integer not null default 30,
  currency currency_code not null default 'CAD',
  status load_status not null default 'draft',
  rate_con_url text,
  bol_url text,
  pod_url text,
  created_at timestamptz not null default now(),
  invoiced_at timestamptz,
  paid_at timestamptz
);

create index loads_user_id_idx on public.loads (user_id);
create index loads_broker_id_idx on public.loads (broker_id);
create index loads_status_idx on public.loads (user_id, status);
create index loads_created_at_idx on public.loads (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- invoices
-- -----------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date not null,
  subtotal numeric(12,2) not null,
  gst_hst_rate numeric(6,5) not null default 0,
  gst_hst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  currency currency_code not null default 'CAD',
  pdf_url text,
  status invoice_status not null default 'draft',
  sent_to_email text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create index invoices_user_id_idx on public.invoices (user_id);
create index invoices_load_id_idx on public.invoices (load_id);
create index invoices_status_idx on public.invoices (user_id, status);
create index invoices_due_date_idx on public.invoices (user_id, due_date);

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan subscription_plan,
  status subscription_status,
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_stripe_customer_idx on public.subscriptions (stripe_customer_id);

-- -----------------------------------------------------------------------------
-- stripe_events (idempotency for webhooks)
-- -----------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Auto-create profile + subscription rows on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.brokers enable row level security;
alter table public.loads enable row level security;
alter table public.invoices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- profiles: users see only their own row.
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- brokers: full CRUD scoped to user_id.
create policy "brokers_self_all" on public.brokers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- loads: full CRUD scoped to user_id.
create policy "loads_self_all" on public.loads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- invoices: full CRUD scoped to user_id.
create policy "invoices_self_all" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions: read-only for the user; writes only via service role.
create policy "subscriptions_self_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- stripe_events: no client access. Service role only.
-- (No policies => RLS denies everything.)

-- -----------------------------------------------------------------------------
-- Storage bucket: documents (private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'documents'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and auth.uid()::text = split_part(name, '/', 1)
  );
