-- Marking an order paid, and remembering what it was booked at.
--
-- Two rows off the change sheet.
--
--   "Ability to manually mark orders as paid. Currently there is no way of
--    marking an item as paid for trade and residential customers."
--
--   "When changing product or delivery fee on an already existing order, it
--    must show the old order total and calculate the difference."
--
-- payment_status was set once when the order was created and nothing could
-- change it afterwards. paid_at is when someone said it was paid; the Payments
-- screen reads the payments row written at the same time.
--
-- booked_total is the total as it stood when the order was taken. Totals are
-- always derived from the lines (§5.2), so this is the one place a historic
-- figure is kept — for the "was $133, now $126.35, −$6.65" line on the Items
-- tab, not for billing. Existing orders are seeded from their current total,
-- which is the best anyone can say about what they were booked at.

alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists booked_total numeric(12,2);

update public.orders o
set booked_total = t.grand_total
from public.order_totals t
where t.order_id = o.id
  and o.booked_total is null;

comment on column public.orders.paid_at is
  'When the order was marked paid by hand or by a payment. Null while unpaid. payment_status is the state; this is the time.';
comment on column public.orders.booked_total is
  'The order total when it was taken. Shown against the live total when lines or fees are changed afterwards. Not used for billing.';
