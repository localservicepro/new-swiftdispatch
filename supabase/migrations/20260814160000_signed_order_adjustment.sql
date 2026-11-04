-- An order adjustment can go either way: a discount off the goods or a surcharge
-- on top. adjustment_value is therefore SIGNED — negative reduces the total,
-- positive increases it — and the totals view adds it rather than subtracting.
comment on column public.orders.adjustment_value is
  'Signed adjustment. Negative = discount off goods, positive = surcharge. Percent types apply to the goods subtotal.';

create or replace view public.order_totals with (security_invoker = true) as
select
  o.id as order_id,
  coalesce(sum(i.line_total), 0) as goods_total,
  case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) + coalesce(o.fuel_surcharge, 0) else 0 end as fee_total,
  coalesce(sum(i.line_total), 0)
    + case when o.method = 'delivery' then coalesce(o.delivery_fee, 0) + coalesce(o.fuel_surcharge, 0) else 0 end
    + case
        when o.adjustment_type = 'percent' then round(coalesce(sum(i.line_total),0) * coalesce(o.adjustment_value,0)/100, 2)
        when o.adjustment_type = 'amount' then coalesce(o.adjustment_value, 0)
        else 0
      end as grand_total
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;
