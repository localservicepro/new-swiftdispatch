-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- §5.1: a master's shared fields propagate to every split that has NOT explicitly
-- overridden them. "Parent and child disagree" is only possible behind an explicit
-- override flag — never by silent drift.
create or replace function public.sync_split_children()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.kind = 'master' then
    update public.orders c set
      street       = case when coalesce((c.overrides->>'address')::boolean,  false) then c.street       else new.street       end,
      suburb_id    = case when coalesce((c.overrides->>'address')::boolean,  false) then c.suburb_id    else new.suburb_id    end,
      delivery_fee = case when coalesce((c.overrides->>'address')::boolean,  false) then c.delivery_fee else new.delivery_fee end,
      fee_source   = case when coalesce((c.overrides->>'address')::boolean,  false) then c.fee_source   else new.fee_source   end,
      delivery_date   = case when coalesce((c.overrides->>'schedule')::boolean, false) then c.delivery_date   else new.delivery_date   end,
      delivery_window = case when coalesce((c.overrides->>'schedule')::boolean, false) then c.delivery_window else new.delivery_window end,
      payment_type = case when c.payment_type_overridden then c.payment_type else new.payment_type end
    where c.parent_order_id = new.id and c.deleted_at is null;
  end if;
  return new;
end $$;

create trigger orders_sync_splits after update on public.orders
  for each row when (new.kind = 'master') execute function public.sync_split_children();

-- §5.3: the billing relationship comes from the customer, never a blank per-order choice.
create or replace function public.derive_payment_type(p_customer_id uuid)
returns public.payment_type language sql stable set search_path = public as $$
  select case
    when c.billing = 'account' and c.terms_days = 7  then 'account_7'::public.payment_type
    when c.billing = 'account' and c.terms_days = 14 then 'account_14'::public.payment_type
    when c.billing = 'account' and c.terms_days = 30 then 'account_30'::public.payment_type
    else 'prepaid'::public.payment_type
  end
  from public.customers c where c.id = p_customer_id
$$;

create or replace function public.orders_default_payment_type()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.payment_type is null and new.customer_id is not null then
    new.payment_type := public.derive_payment_type(new.customer_id);
  end if;
  if new.payment_type is null then
    new.payment_type := 'prepaid';  -- walk-in yard sale settles at the counter
  end if;
  return new;
end $$;

create trigger orders_payment_type before insert on public.orders
  for each row execute function public.orders_default_payment_type();

-- Order totals always derived from order_items (§5.2) + the order's own fee — one read path.
create or replace view public.order_totals with (security_invoker = true) as
select
  o.id as order_id,
  coalesce(sum(i.line_total), 0) as goods_total,
  case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) else 0 end as fee_total,
  coalesce(sum(i.line_total), 0)
    + case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) else 0 end
    + case
        when o.adjustment_type = 'percent' then round(coalesce(sum(i.line_total),0) * -coalesce(o.adjustment_value,0)/100, 2)
        when o.adjustment_type = 'amount' then -coalesce(o.adjustment_value, 0)
        else 0
      end as grand_total
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

-- §5.3: statement eligibility is a CONSEQUENCE of the billing relationship —
-- yard sales on account route through the same resolver, never special-cased.
create or replace view public.statement_eligible_orders with (security_invoker = true) as
select o.*
from public.orders o
where o.deleted_at is null
  and o.payment_type in ('account_7','account_14','account_30');

-- Admin PIN sign-in: drivers can never open the back office.
create or replace function public.admin_login(p_pin text)
returns table (id uuid, name text, role public.team_role)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.role
  from public.team_members t
  where t.pin = p_pin and t.active and t.role in ('super_admin','admin')
$$;

-- Next order number from business settings' format (ORD-######)
create sequence public.order_number_seq start 531090;
create or replace function public.next_order_number()
returns text language sql volatile set search_path = public as $$
  select 'ORD-' || nextval('public.order_number_seq')::text
$$;
