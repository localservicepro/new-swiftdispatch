-- Delivery addresses the yard has actually used, and a way to retire a customer
-- record without losing the orders that point at it.
--
-- Two requests off the change sheet:
--
--   "Automatically saves the past 6 addresses that we have delivered to for each
--    customer ... we must also have the ability to edit saved addresses under the
--    Customer Details in Customers, including the Label associated with each."
--
--   "Function to delete customers."
--
-- customer_sites already holds addresses, but nothing recorded when one was last
-- delivered to, so there was no way to say which six are the recent ones. That
-- is the whole of the first change: a timestamp, and an index to read it by.

alter table public.customer_sites
  add column if not exists last_used_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists auto_captured boolean not null default false;

-- Everything already on file predates the column. Treating it as never-used
-- would push real addresses behind the first six typed after today, so seed it
-- from the customer's most recent order to that street where there is one, and
-- fall back to the row's own creation time.
update public.customer_sites s
set last_used_at = coalesce(
  (select max(o.placed_at)
     from public.orders o
    where o.customer_id = s.customer_id
      and o.deleted_at is null
      and lower(trim(o.street)) = lower(trim(s.street))),
  s.created_at
)
where s.last_used_at is null;

create index if not exists customer_sites_recent_idx
  on public.customer_sites (customer_id, last_used_at desc nulls last);

-- Only the addresses the app captured on its own are subject to the cap of six.
-- An address someone typed in and named — "back paddock, gate is the second one"
-- — is the whole reason the yard wanted this, and losing it because six other
-- deliveries happened since would be worse than a long list. Naming an
-- auto-captured address claims it, so it stops being trimmable too.
comment on column public.customer_sites.auto_captured is
  'True for an address recorded automatically when an order was delivered to it. Only these are trimmed to the six most recent; editing the label clears the flag.';

-- A customer who has never ordered can be deleted outright; contacts and sites
-- cascade from the existing foreign keys. One with orders cannot — statements,
-- invoices and four years of history read through that row — so it is archived
-- instead: hidden everywhere a customer is chosen, still readable everywhere one
-- is displayed. Same rule the orders table already follows.
alter table public.customers
  add column if not exists archived_at timestamptz;

create index if not exists customers_archived_idx
  on public.customers (archived_at)
  where archived_at is not null;

comment on column public.customers.archived_at is
  'Set when a customer with order history is removed from the book. The row stays so statements and invoices still read; every picker filters it out.';

comment on column public.customer_sites.last_used_at is
  'When an order was last delivered to this address. The new-order screen offers the six most recent per customer.';
