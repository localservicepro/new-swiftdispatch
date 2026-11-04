/* MYOB AccountRight integration.

   SHGS raise sales in MYOB on the Professional sale layout: one line per
   delivery, account 4-1010, job G, tax code GST, tax-inclusive. An ORDER
   accumulates lines across the month and is converted to an INVOICE later;
   a one-off sale is pushed straight as an INVOICE. Everything that varies
   between those two shapes lives in myob_settings so the office configures
   it once instead of retyping it per sale. */

create table if not exists public.myob_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,

  company_file_id text,
  company_file_name text,

  sale_layout text not null default 'Professional'
    check (sale_layout in ('Professional', 'Service', 'Item')),
  push_as text not null default 'invoice' check (push_as in ('order', 'invoice')),

  /* The MYOB UIDs are cached beside the human-readable codes so a push never
     has to re-walk the lookup endpoints, but the codes stay authoritative —
     re-resolving a code is cheap, guessing a stale UID is not. */
  account_code text default '4-1010',
  account_uid uuid,
  job_code text default 'G',
  job_uid uuid,
  tax_code text default 'GST',
  tax_code_uid uuid,
  is_tax_inclusive boolean not null default true,

  terms_note text,
  description_template text not null default '{order_number}{po_prefix} - {items} - {method} - {address}',
  journal_memo_template text not null default 'Sale; {customer}',

  line_date_rule text not null default 'delivery' check (line_date_rule in ('delivery', 'placed')),
  header_date_rule text not null default 'delivery'
    check (header_date_rule in ('delivery', 'placed', 'month_end')),

  delivery_status text not null default 'To be Printed',
  delivery_word text not null default 'DEL',
  pickup_word text not null default 'Picked up from yard',

  auto_push boolean not null default false,
  last_pushed_at timestamptz,
  updated_at timestamptz not null default now()
);

/* Credentials live in their own table so the app-wide "app access" policy on
   settings never exposes them. RLS is on with no policies at all: the anon and
   authenticated keys can see nothing here, and only the service role — i.e. the
   myob-push edge function — can read or write. */
create table if not exists public.myob_credentials (
  id boolean primary key default true check (id),
  client_id text,
  client_secret text,
  refresh_token text,
  access_token text,
  access_token_expires_at timestamptz,
  cf_token text,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists myob_uid uuid;
alter table public.orders add column if not exists myob_doc_type text
  check (myob_doc_type in ('order', 'invoice'));
alter table public.orders add column if not exists myob_number text;
alter table public.orders add column if not exists myob_pushed_at timestamptz;
alter table public.orders add column if not exists myob_error text;

create index if not exists orders_myob_pending_idx on public.orders (myob_pushed_at)
  where deleted_at is null and myob_pushed_at is null;

alter table public.customers add column if not exists myob_uid uuid;

alter table public.myob_settings enable row level security;
drop policy if exists "app access" on public.myob_settings;
create policy "app access" on public.myob_settings
  for all to anon, authenticated using (true) with check (true);

alter table public.myob_credentials enable row level security;

insert into public.myob_settings (id) values (true) on conflict (id) do nothing;
insert into public.myob_credentials (id) values (true) on conflict (id) do nothing;
