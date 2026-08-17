-- Recovering the line items the old app's order_items table never held.
--
-- Run once on 2026-08-17, straight after migrate_legacy_data.sql. Like that
-- file, this is a record of what was done rather than something to replay.
--
-- WHAT WAS WRONG
--
-- The first migration found 4,749 orders with a subtotal on the order row and
-- nothing in order_items, and gave each one a single placeholder line so the
-- money would survive. That was the wrong conclusion. The old app displays the
-- products for those orders perfectly well — ORD-1755834963150-94 shows
-- "20mm Crushed Rock m³ $90 (Qty: 0.25)" — because it does not read order_items
-- for them. It reads order_sms_webhooks.products_formatted, a flat string built
-- when the delivery SMS went out, and for roughly half the order book that
-- string is the only itemisation that exists.
--
-- THE FORMAT, AND WHY IT CANNOT BE SPLIT ON COMMAS
--
--   20mm Crushed Rock m³ $90 (Qty: 0.25)
--   SR230R1530 SHAPESCAPER® Ring 230mm profile, 1530mm Diameter $300 (Qty: 1),
--     SE075G20 KIT 75x2mmx2.4Mtr … (3x230mm Ribbed Stakes, 1x Connector, 7x
--     Screws) $45 (Qty: 7)
--
-- Entries are joined with ", " and product names contain both commas and
-- parenthesised lists, so the separator is useless as a delimiter. What is
-- reliable is the terminator: every entry ends "$<price> (Qty: <n>)". So the
-- regex anchors on that and takes the name to be whatever precedes it.
--
-- HOW IT WAS CHECKED BEFORE IT WAS TRUSTED
--
-- 5,157 orders have both a real order_items row and a webhook string. Parsing
-- their strings and comparing against the rows they already have reproduces
-- 5,150 of them exactly — same amount, same line count. The 7 that differ are
-- orders edited after the SMS was sent, which is drift in the old data, not a
-- parse failure.
--
-- On top of that, no placeholder was replaced unless the recovered lines summed
-- to the exact subtotal the old app had recorded for that order. All 4,514
-- orders with a webhook string passed; not one had to be rejected.
--
-- WHAT LANDED
--
--   4,514 orders re-itemised, 6,898 real lines in place of 4,514 placeholders
--   $1,208,955 of goods now itemised rather than sitting on one nameless line
--     165 orders keep the placeholder — no webhook string exists for them
--       2 orders still have no lines at all and no recorded subtotal either
--
-- Order totals still reconcile against the old app's own total_amount on 9,833
-- of 9,920 non-master orders, unchanged by this pass — the recovery replaced
-- how the goods are described without moving a cent.

begin;

-- One webhook row per order, the most recent, ignoring the ones with no text.
create table stage.webhook_text as
select distinct on (order_id) order_id, products_formatted, created_at
from src.order_sms_webhooks
where coalesce(trim(products_formatted),'') <> ''
order by order_id, created_at desc;

-- Each entry ends "$<price> (Qty: <n>)". The name is everything before the
-- price, and it cannot be found by splitting on commas: product names carry
-- their own. So the terminator is the anchor and the name is what precedes it.
create table stage.parsed_lines as
select w.order_id,
       g.ord,
       btrim(regexp_replace(g.m[1], '^[,\s]+', '')) name,
       g.m[2]::numeric unit_price,
       g.m[3]::numeric qty
from stage.webhook_text w,
     lateral regexp_matches(
       w.products_formatted,
       '([^$]*?)\$\s*([0-9]+(?:\.[0-9]+)?)\s*\(Qty:\s*([0-9]+(?:\.[0-9]+)?)\)',
       'g'
     ) with ordinality as g(m, ord);

-- Names in the SMS text sometimes carry the SKU in front ("SE075G20 KIT
-- 75x2mm…"), so the whole string, the string with a leading SKU stripped, and
-- the leading token as a SKU are all tried. 491 of 574 distinct names resolve;
-- the other 83 are lines the yard has since retired from the catalogue.
create table stage.name_match as
with norm as (
  select distinct name,
         lower(regexp_replace(name, '\s+', ' ', 'g')) k_full,
         lower(regexp_replace(regexp_replace(name, '^[A-Z0-9]{5,14}\s+', ''), '\s+', ' ', 'g')) k_nosku
  from stage.parsed_lines
),
prod as (select id, lower(regexp_replace(name, '\s+', ' ', 'g')) k from public.products)
select n.name,
       coalesce(
         (select p.id from prod p where p.k = btrim(n.k_full) limit 1),
         (select p.id from prod p where p.k = btrim(n.k_nosku) limit 1),
         (select p.id from public.products p where upper(p.sku) = upper(split_part(n.name,' ',1)) limit 1)
       ) product_id
from norm n;

-- Only orders whose recovered lines add up to the subtotal the old app recorded
-- get their placeholder replaced. Every one of them does; the check stays so
-- the statement cannot quietly rewrite an order it has not accounted for. The
-- placeholder's own unit_price is that recorded subtotal, which is how the
-- first migration stored it.
create temp table recoverable as
with ph as (
  select i.order_id, i.id line_id, round(i.unit_price::numeric,2) subtotal
  from public.order_items i where i.description = 'Goods — not itemised in the previous system'
),
p as (select order_id, round(sum(qty*unit_price)::numeric,2) amt from stage.parsed_lines group by order_id)
select ph.order_id, ph.line_id from ph join p on p.order_id = ph.order_id and p.amt = ph.subtotal;

delete from public.order_items i using recoverable r where i.id = r.line_id;

insert into public.order_items (order_id, product_id, variant_id, description, qty, unit_price, created_at)
select l.order_id, m.product_id, null,
       -- A product still in the catalogue needs no description; one that has
       -- been retired since keeps its name here, because otherwise the line
       -- would say nothing at all about what went out.
       case when m.product_id is null then l.name end,
       l.qty, l.unit_price,
       coalesce((select o.created_at from public.orders o where o.id = l.order_id), now())
from stage.parsed_lines l
join recoverable r on r.order_id = l.order_id
left join stage.name_match m on m.name = l.name;

commit;

-- The pipe was torn down again afterwards, both ends, exactly as in
-- migrate_legacy_data.sql.
