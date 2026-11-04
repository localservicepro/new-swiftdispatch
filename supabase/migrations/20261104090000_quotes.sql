-- Quotes.
--
-- "Teams requested if we could add quotation section." — "Save as quote
-- rather than go to order. Goes under customer details for later reference."
--
-- A quote is written up on the New order screen exactly like an order, then
-- saved against the customer instead of being created. It is its own record,
-- not a kind of order: every screen filters the order book in its own way
-- (board, badge, dashboard, reports, payments, statements, MYOB, the portal,
-- three triggers) and a quote would have to be hidden from each of them by
-- hand. Separate tables make that impossible by construction. It also keeps
-- the ORD sequence for orders — a quote that never converts burns no number.
--
-- Prices, fees and the fuel surcharge are locked on the quote as written, so
-- the printed total is what the customer was told. The delivery drafts are
-- kept as the New order screen holds them, so "Use for an order" puts the
-- quote back on that screen and the order is created through the same checks
-- as any other.

create type public.quote_status as enum ('open','sent','accepted','declined','converted');

create sequence public.quote_number_seq start 1001;
create or replace function public.next_quote_number()
returns text language sql volatile set search_path = public as $$
  select 'QTE-' || nextval('public.quote_number_seq')::text
$$;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  revision int not null default 1,
  status public.quote_status not null default 'open',
  customer_id uuid not null references public.customers(id),
  contact_id uuid references public.customer_contacts(id),
  method public.fulfilment_method not null default 'delivery',
  -- the delivery drafts as the New order screen holds them:
  -- [{letter, dateIso, window, street, suburbId, fee, feeSource, truckId}]
  deliveries jsonb not null default '[]'::jsonb,
  settle_method public.payment_method,
  po_number text,
  order_notes text,
  delivery_notes text,
  adjustment_type text check (adjustment_type in ('percent','amount')),
  adjustment_value numeric(10,2),
  fuel_surcharge numeric(10,2) not null default 0,
  -- locked when the quote was written; the lines and fees above add up to it
  quoted_total numeric(12,2) not null default 0,
  valid_until date not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  converted_at timestamptz,
  order_id uuid references public.orders(id),
  created_by uuid references public.team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index quotes_customer_idx on public.quotes (customer_id) where deleted_at is null;

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  description text,
  qty numeric(12,3) not null check (qty > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(12,2) generated always as (round(qty * unit_price, 2)) stored,
  -- which delivery the line belongs to on a split quote
  delivery_letter text not null default 'A',
  created_at timestamptz not null default now()
);

create index quote_items_quote_idx on public.quote_items (quote_id);

create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- An order raised from a quote says so, and the invoice prints it.
alter table public.orders add column if not exists quote_id uuid references public.quotes(id);

alter table public.business_settings
  add column if not exists quote_valid_days int not null default 14,
  add column if not exists quote_terms text not null default
    'Prices are valid until the date shown. Delivery is subject to site access and availability.';

comment on table public.quotes is
  'A priced offer written up on the New order screen and saved against the customer. Not an order: nothing here reaches the board, reports, payments or statements.';
comment on column public.quotes.deliveries is
  'The delivery drafts as the New order screen holds them, so the quote can be put back on that screen and taken as an order.';
comment on column public.quotes.quoted_total is
  'The total as written. Lines, fees and the surcharge are locked on the quote, so this is what the customer was told.';

-- Same access as every other app table (see 20260814110211_rls_policies.sql).
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
create policy "app access" on public.quotes for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.quote_items for all to anon, authenticated using (true) with check (true);

-- Live between screens, like the rest (see 20261023130000_realtime_publication.sql).
do $$
declare t text;
begin
  foreach t in array array['quotes','quote_items'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
