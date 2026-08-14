-- Driver portal PIN sign-in: drivers only, mirroring admin_login.
create or replace function public.driver_login(p_pin text)
returns table (id uuid, name text, role public.team_role)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.role
  from public.team_members t
  where t.pin = p_pin and t.active and t.role = 'driver'
$$;
