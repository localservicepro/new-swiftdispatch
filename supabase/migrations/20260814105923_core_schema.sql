-- SwiftDispatch Pro — core schema
-- Encodes the rebuild brief's architectural fixes at the data-model level:
--   §5.1 split orders read shared fields from their master (see sync trigger migration)
--   §5.2 order_items is the ONLY source of truth for line items (no JSON blob anywhere)
--   §5.3 payment_type (billing relationship, derived from customer) is a separate field
--        from payment_method (how one transaction settled)
--   §5.5 payment_method is nullable — null means "not set", never silently defaulted
--   §5.8 delivery fees resolve from the suburbs table via suburb_id, never from a street string

create type public.order_status as enum
  ('requested','preparing','loading','en_route','delivered','on_hold','cancelled','ready_for_pickup');
create type public.payment_status as enum ('pending','paid','invoiced','failed','refunded');
create type public.payment_method as enum
  ('cash','card','cod','card_on_file','direct_debit','invoice','on_account');
create type public.payment_type as enum ('prepaid','account_7','account_14','account_30');
create type public.fulfilment_method as enum ('delivery','pickup');
create type public.fee_source as enum ('suburb','manual');
create type public.order_kind as enum ('standard','master','split','yard_sale');
create type public.customer_entity as enum ('Individual','Sole trader','Company');
create type public.customer_tier as enum ('Retail','Trade');
create type public.billing_type as enum ('prepaid','account');
create type public.team_role as enum ('super_admin','admin','driver');
create type public.truck_type as enum ('crane','small','medium','large','semi','tipper','float');
create type public.truck_status as enum ('Available','Loading','Assigned','Out of service');
create type public.product_unit as enum ('m³','t','kg','bag','each','pallet');

-- §5.8: the suburb entity is the single source for every delivery fee.
create table public.suburbs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  postcode text not null check (postcode ~ '^[0-9]{4}$'),
  state text not null default 'VIC',
  delivery_fee numeric(10,2),          -- null = no rate set: orders are BLOCKED, not free
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, postcode)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.product_categories(id),
  unit public.product_unit not null default 'each',
  -- null = inherit the unit's default divisibility; a product's own flag wins
  fractional boolean,
  kind text not null default 'single' check (kind in ('single','variable')),
  price numeric(10,2) not null check (price >= 0),
  stock numeric(12,3) not null default 0,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text not null unique,
  price numeric(10,2) not null check (price >= 0),
  stock numeric(12,3) not null default 0
);

create table public.specials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent','amount')),
  value numeric(10,2) not null check (value > 0),
  scope text not null check (scope in ('all','category','products')),
  category_id uuid references public.product_categories(id),
  from_date date,
  to_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.special_products (
  special_id uuid not null references public.specials(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (special_id, product_id)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role public.team_role not null default 'driver',
  email text,                          -- optional by design
  phone text,
  active boolean not null default true,
  pin text check (pin ~ '^[0-9]{4}$'), -- null = not set (renders "— not set —")
  is_owner boolean not null default false, -- cannot remove own/owner access
  created_at timestamptz not null default now()
);

create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  rego text not null unique,
  type public.truck_type not null default 'medium',
  status public.truck_status not null default 'Available',
  capacity_tonnes numeric(6,2),
  fuel text default 'Diesel',
  year int,
  last_maintenance date,
  next_maintenance date,
  notes text,
  created_at timestamptz not null default now()
);

-- §5.3: billing_type + terms on the CUSTOMER drive the order's billing relationship.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  account_number text not null unique,
  name text not null,
  entity public.customer_entity not null default 'Individual',
  abn text,
  tier public.customer_tier not null default 'Retail',
  billing public.billing_type not null default 'prepaid',
  terms_days int check (terms_days in (7,14,30)),  -- required when billing = account
  credit_limit numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  stop_credit boolean not null default false,       -- manual hold; over-limit blocks automatically
  customer_since date not null default current_date,
  billing_street text,
  billing_suburb_id uuid references public.suburbs(id),
  portal_enabled boolean not null default false,
  portal_pin text check (portal_pin ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  -- §5.3: impossible to create an account customer without an explicit billing relationship
  constraint account_needs_terms check (billing <> 'account' or terms_days is not null)
);

create unique index customers_portal_pin_unique on public.customers (portal_pin)
  where portal_pin is not null;  -- portal logs in on the PIN alone, so it must be unique

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,          -- a name is all you need
  phone text,
  email text,                  -- fully optional by design
  roles text[] not null default '{Orders}',
  created_at timestamptz not null default now()
);

create table public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null,
  street text not null,
  suburb_id uuid references public.suburbs(id),
  is_default boolean not null default false
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  kind public.order_kind not null default 'standard',
  parent_order_id uuid references public.orders(id) on delete cascade, -- splits point at their master
  customer_id uuid references public.customers(id),
  contact_id uuid references public.customer_contacts(id),
  walk_in_name text,                          -- yard sale with no customer record
  -- per-order customer detail override that never writes back to the profile
  customer_override jsonb,
  status public.order_status not null default 'requested',
  method public.fulfilment_method not null default 'delivery',
  street text,
  suburb_id uuid references public.suburbs(id),  -- §5.8 structured address
  delivery_fee numeric(10,2),
  fee_source public.fee_source not null default 'suburb',
  delivery_date date,
  delivery_window text,                       -- 'ASAP', 'Within the hour', '07:00 – 11:00', …
  placed_at timestamptz not null default now(),
  truck_id uuid references public.trucks(id),
  driver_id uuid references public.team_members(id),
  -- §5.3: two separate fields, never one merged picker
  payment_type public.payment_type,           -- derived from the customer; overridden explicitly
  payment_type_overridden boolean not null default false,
  payment_method public.payment_method,       -- §5.5: null = "not set", never defaulted
  payment_status public.payment_status not null default 'pending',
  po_number text,
  order_notes text,                           -- commercial: statements, PO references
  delivery_notes text,                        -- operational: reaches the driver
  adjustment_type text check (adjustment_type in ('percent','amount')),
  adjustment_value numeric(10,2),
  -- "already processed/printed" indicator
  processed_at timestamptz,
  processed_by uuid references public.team_members(id),
  -- §5.1: which shared fields this split has explicitly overridden
  -- e.g. {"address": true, "schedule": true, "items": true, "assignment": true, "status": true}
  overrides jsonb not null default '{}'::jsonb,
  pod_photo_url text,
  pod_at timestamptz,
  deleted_at timestamptz,                     -- soft delete → deleted-orders recovery view
  created_by uuid references public.team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint split_has_parent check (kind <> 'split' or parent_order_id is not null),
  constraint master_has_no_parent check (kind <> 'master' or parent_order_id is null)
);

create index orders_status_idx on public.orders (status) where deleted_at is null;
create index orders_customer_idx on public.orders (customer_id);
create index orders_parent_idx on public.orders (parent_order_id);
create index orders_placed_idx on public.orders (placed_at);

-- §5.2: THE source of truth for line items. Every surface reads these rows.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  description text,                            -- survives product deletion / free-text credit lines
  qty numeric(12,3) not null,                  -- negative qty = returned/credit line
  unit_price numeric(10,2) not null,
  line_total numeric(12,2) generated always as (round(qty * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id),
  amount numeric(12,2) not null,
  method public.payment_method,
  status public.payment_status not null default 'pending',
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  ref text not null,
  period_start date not null,
  period_end date not null,
  scope text not null default 'all' check (scope in ('all','delivered')),
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null default 0,
  generated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.team_members(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  author_id uuid references public.team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id boolean primary key default true check (id),  -- singleton row
  name text not null default '',
  email text, phone text, website text, address text, abn text, hours text,
  doc_format text not null default 'ORD-######',
  master_prefix text not null default 'MO — ',
  print_delivery_notes boolean not null default true
);

create table public.payment_settings (
  id boolean primary key default true check (id),
  gst_on boolean not null default true,
  gst_rate numeric(5,2) not null default 10,
  gst_label text not null default 'GST',
  gst_inclusive boolean not null default true,
  card_surcharge numeric(5,2) not null default 0,
  markup_type text not null default 'fixed' check (markup_type in ('percent','fixed')),
  markup_value numeric(10,2) not null default 0,
  fuel_surcharge numeric(10,2) not null default 0,
  currency text not null default 'AUD',
  default_fee numeric(10,2) not null default 0
);

create table public.integration_settings (
  key text primary key check (key in ('myob','mycrmsim','sheets')),
  connected boolean not null default false,
  account text,
  field_a text,
  field_b text,
  auto_sync boolean not null default false,
  last_synced timestamptz
);

create table public.email_settings (
  key text primary key check (key in ('confirm','status','receipt','pin','statement')),
  enabled boolean not null default true
);
