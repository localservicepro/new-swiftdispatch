-- Returns and the credits they create.
--
-- The old system kept both and the new schema had nowhere to put them, so the
-- history had nowhere to land. These are the two tables it was missing.

-- A return is recorded against the delivery the goods came back from. The lines
-- that came back are kept as they were read off the docket rather than as
-- foreign keys: a product can be renamed or retired years after the goods went
-- back, and the return should still say what was returned.
create table if not exists public.order_returns (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  return_date   date not null default current_date,
  returned_items jsonb not null default '[]'::jsonb,
  return_reason text,
  return_notes  text,
  status        text not null default 'pending' check (status in ('pending','processed','cancelled')),
  total_items_returned integer not null default 0,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists order_returns_order on public.order_returns(order_id);

-- Credit sits on the account, not on an order. source_order_id is where it came
-- from and used_in_order_id is where it went; both are nullable, because a
-- credit can be granted by hand and can sit unspent indefinitely.
create table if not exists public.customer_credits (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  amount        numeric(12,2) not null,
  status        text not null default 'available' check (status in ('available','used','expired','cancelled')),
  source_order_id uuid references public.orders(id) on delete set null,
  used_in_order_id uuid references public.orders(id) on delete set null,
  created_from_return_id uuid references public.order_returns(id) on delete set null,
  description   text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists customer_credits_customer on public.customer_credits(customer_id);

alter table public.order_returns enable row level security;
alter table public.customer_credits enable row level security;
create policy "app access" on public.order_returns for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.customer_credits for all to anon, authenticated using (true) with check (true);
