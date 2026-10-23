-- Customer portal sign-in: the PIN alone (unique across customers), portal must
-- be enabled by the yard. Returns just what the portal needs to identify the account.
create or replace function public.portal_login(p_pin text)
returns table (id uuid, name text, account_number text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.account_number
  from public.customers c
  where c.portal_pin = p_pin and c.portal_enabled
$$;
