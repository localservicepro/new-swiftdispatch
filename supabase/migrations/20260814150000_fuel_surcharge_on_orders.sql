-- Delivery pricing: the fee charged = suburb rate + markup (payment_settings),
-- and the fuel surcharge is its own line on the order, not folded into the fee.
alter table public.orders add column fuel_surcharge numeric(10,2) not null default 0;

create or replace view public.order_totals with (security_invoker = true) as
select
  o.id as order_id,
  coalesce(sum(i.line_total), 0) as goods_total,
  case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) + coalesce(o.fuel_surcharge, 0) else 0 end as fee_total,
  coalesce(sum(i.line_total), 0)
    + case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) + coalesce(o.fuel_surcharge, 0) else 0 end
    + case
        when o.adjustment_type = 'percent' then round(coalesce(sum(i.line_total),0) * -coalesce(o.adjustment_value,0)/100, 2)
        when o.adjustment_type = 'amount' then -coalesce(o.adjustment_value, 0)
        else 0
      end as grand_total
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;
