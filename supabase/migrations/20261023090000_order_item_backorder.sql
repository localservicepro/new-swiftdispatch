-- Backorders, one line at a time.
--
-- Off the change sheet: "Ability to put specific products on an order into
-- backorder, like the previous system. Currently there is no way of putting
-- specific products on hold."
--
-- The old app had back_order as an order status — the whole order waited. The
-- yard wants it finer than that: the crushed rock goes out today, the three
-- bags of cement that are not in stock go out when they land, and the order
-- stays one order with one total. So the flag lives on the line, not the order.
--
-- A backordered line stays on the order and in its total. It is marked on the
-- Items tab, on the board card, and on the run sheet as "do not load", and the
-- invoice names it as on backorder. Nothing is split or re-priced; releasing it
-- is clearing the flag.

alter table public.order_items
  add column if not exists backordered boolean not null default false;

comment on column public.order_items.backordered is
  'True while this line is held for a later delivery. The line stays on the order and in its total; the run sheet lists it as not on this load.';
