-- Row Level Security.
-- The admin app signs in with a staff PIN (admin_login RPC) rather than Supabase Auth,
-- so at this stage every table grants access to the API roles with RLS enabled as the
-- enforcement point. When Supabase Auth is wired in, tighten each policy to
-- `to authenticated` plus role checks without touching the schema.

alter table public.suburbs enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.specials enable row level security;
alter table public.special_products enable row level security;
alter table public.team_members enable row level security;
alter table public.trucks enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.customer_sites enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.statements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notes enable row level security;
alter table public.business_settings enable row level security;
alter table public.payment_settings enable row level security;
alter table public.integration_settings enable row level security;
alter table public.email_settings enable row level security;

-- Catalogue & reference data: readable by anyone (storefront browses products),
-- writable by app roles.
create policy "read reference" on public.suburbs for select using (true);
create policy "write reference" on public.suburbs for all to anon, authenticated using (true) with check (true);
create policy "read categories" on public.product_categories for select using (true);
create policy "write categories" on public.product_categories for all to anon, authenticated using (true) with check (true);
create policy "read products" on public.products for select using (true);
create policy "write products" on public.products for all to anon, authenticated using (true) with check (true);
create policy "read variants" on public.product_variants for select using (true);
create policy "write variants" on public.product_variants for all to anon, authenticated using (true) with check (true);
create policy "read specials" on public.specials for select using (true);
create policy "write specials" on public.specials for all to anon, authenticated using (true) with check (true);
create policy "read special products" on public.special_products for select using (true);
create policy "write special products" on public.special_products for all to anon, authenticated using (true) with check (true);

-- Operational data: full access for the app roles (PIN gate lives in the app + admin_login RPC).
create policy "app access" on public.team_members for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.trucks for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.customers for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.customer_contacts for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.customer_sites for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.orders for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.order_items for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.payments for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.statements for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.activity_logs for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.notes for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.business_settings for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.payment_settings for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.integration_settings for all to anon, authenticated using (true) with check (true);
create policy "app access" on public.email_settings for all to anon, authenticated using (true) with check (true);
