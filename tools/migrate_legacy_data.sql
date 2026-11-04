-- One-off migration of the live yard data out of the old Lovable app.
--
-- This is a record of what was run, not something to replay. It ran once, on
-- 2026-08-17, moving every record from the old project (wntcxbxitsanbyrtfhwv,
-- ap-southeast-1) into this one (zksvmdbnlpwrrfbtvksl, ap-southeast-2). It is
-- kept in the repo because the judgement calls below are the answer to "why does
-- order X look like that" for the next several years, and those answers are not
-- recoverable from the data once it has landed.
--
-- HOW IT RAN
--
-- Ten thousand orders will not pass through a tool result and the old project's
-- Postgres is not reachable from outside, so nothing was exported: a postgres_fdw
-- server was pointed at the old project, its tables were copied into a `stage`
-- schema here, and every row was mapped server-side. The pipe was torn down
-- afterwards — the foreign server, the `src` and `stage` schemas, and the
-- read-only role on the old project were all dropped once the counts checked
-- out. Re-running this file would need that pipe rebuilt first.
--
-- WHAT LANDED
--
--   suburbs             348  (353 in, 5 duplicates merged)
--   product_categories   49
--   products            904
--   customers          2323
--   customer_contacts  5216  (3171 in, plus each account's own person)
--   orders            10043
--   order_items       14229  (9550 carried over, 4679 reconstructed — see below)
--   order_returns        14
--   customer_credits      9
--
-- Order totals reconcile against the old app's own recorded total_amount on
-- 9834 of 9920 non-master orders. Of the 86 that do not, 77 are orders whose
-- own row never added up in the old system (its total_amount disagreed with its
-- own subtotal + fee + surcharge) and 9 are orders whose subtotal disagreed with
-- its own lines. Both are pre-existing; the new app recomputes from the lines,
-- so those orders are now internally consistent for the first time.

begin;

-- ---------------------------------------------------------------- helpers

-- delivery_rate arrives as text ("AU$85.00", "", "85"). Anything that is not a
-- number becomes no rate at all, which blocks orders to that suburb until
-- someone prices it — never a silent zero (§5.5, §5.8).
create or replace function stage.money(t text) returns numeric language sql immutable as $$
  select case when nullif(regexp_replace(coalesce(t,''), '[^0-9.\-]', '', 'g'), '') ~ '^-?(\d+\.?\d*|\.\d+)$'
              then regexp_replace(coalesce(t,''), '[^0-9.\-]', '', 'g')::numeric end
$$;

-- The old data uses punctuation as a placeholder for "nothing here" — a lone
-- dot, "..", "**". Those are not names.
create or replace function stage.real(t text) returns text language sql immutable as $$
  select case when btrim(coalesce(t,''), '.*-_ ') = '' then null else trim(t) end
$$;

-- contact_role was a free-text box and the yard put anything in it — postcodes,
-- phone numbers, "7 Day". Only what reads as a job title survives as a role.
create or replace function stage.role_label(t text) returns text language sql immutable as $$
  select case
    when stage.real(t) is null then 'Contact'
    when trim(t) ~ '^[0-9 +()\-]+$' then 'Contact'
    when length(trim(t)) > 28 then 'Contact'
    else trim(t)
  end
$$;

-- ---------------------------------------------------------------- suburbs

-- Five suburbs are recorded twice under the same name and postcode. The new
-- schema will not have that, so one row wins — the one carrying a rate, active
-- first — and everything pointing at the loser is redirected to it.
create table stage.suburb_map as
select s.id, first_value(s.id) over (
         partition by lower(trim(s.name)), trim(s.postcode)
         order by (stage.money(s.delivery_rate) is null), s.is_active desc nulls last, s.id
       ) canonical_id
from stage.suburbs s;
create unique index on stage.suburb_map(id);

insert into public.suburbs (id, name, postcode, state, delivery_fee, active)
select s.id, trim(s.name), trim(s.postcode), upper(coalesce(nullif(trim(s.state),''),'VIC')),
       stage.money(s.delivery_rate), coalesce(s.is_active, true)
from stage.suburbs s join stage.suburb_map m on m.id = s.id and m.canonical_id = s.id;

-- ---------------------------------------------------------------- catalogue

insert into public.product_categories (id, name, sort_order)
select c.id, trim(c.name), row_number() over (order by trim(c.name)) from stage.product_categories c;

-- The old catalogue has no unit column: quantity was just a number. Unit is read
-- back from the category, which is the only place the yard recorded it — bulk
-- goods are sold by the cubic metre, bagged goods by the bag, and everything
-- else one at a time. 501 products have no SKU and the new schema requires one,
-- so those get a generated LEG- code derived from their id, which is stable and
-- obviously not a real part number.
insert into public.products (id, sku, name, category_id, unit, fractional, kind, price, stock, active, created_at)
select p.id,
       coalesce(nullif(trim(p.sku), ''), 'LEG-' || upper(substr(replace(p.id::text,'-',''), 1, 8))),
       trim(p.name), p.category_id,
       (case
          when c.name in ('Bulk Products','Specialised Bulk Products','Sand & Soil','Mulch','Stones','Pebbles','Screeds') then 'm³'
          when c.name in ('Bag Products','Manure & Fertiliser','Cement Australia','Oxide','Seed') then 'bag'
          else 'each'
        end)::product_unit,
       coalesce(c.allows_fractional_quantities, false),
       coalesce(nullif(trim(p.product_type), ''), 'single'),
       p.price, coalesce(p.stock_quantity, 0), coalesce(p.is_active, true), p.created_at
from stage.products p left join stage.product_categories c on c.id = p.category_id;

-- ---------------------------------------------------------------- customers

insert into public.customers
  (id, account_number, name, entity, abn, tier, billing, terms_days, credit_limit, balance,
   stop_credit, customer_since, billing_street, billing_suburb_id, portal_enabled, portal_pin, created_at)
select c.id,
       trim(c.account_number),
       -- An account is named for the business when there is one, and for the
       -- person otherwise. A business with no company name falls back to the
       -- person rather than importing nameless. 23 accounts carry punctuation in
       -- every name field and end up named for their account number, which at
       -- least stays findable.
       coalesce(
         case when c.entity_type = 'business'
              then coalesce(stage.real(c.company_name), stage.real(c.business_name)) end,
         nullif(concat_ws(' ', stage.real(c.first_name), stage.real(c.last_name)), ''),
         stage.real(c.company_name), stage.real(c.business_name),
         '(unnamed ' || trim(c.account_number) || ')'
       ),
       (case when c.entity_type = 'business' then 'Company' else 'Individual' end)::customer_entity,
       null,
       -- customer_type carries two of our fields at once: which price list they
       -- are on, and how they settle.
       (case when lower(c.customer_type) in ('trade','account') then 'Trade' else 'Retail' end)::customer_tier,
       (case when lower(c.customer_type) = 'account' then 'account' else 'prepaid' end)::billing_type,
       case when lower(c.customer_type) = 'account' then 30 end,
       -- Balance and credit limit are not in the old data at all. They start at
       -- zero and are rebuilt from the ledger rather than guessed at.
       0, 0,
       coalesce(c.stop_credit, false),
       coalesce(c.created_at::date, current_date),
       stage.real(c.full_address),
       m.canonical_id,
       coalesce(c.portal_access_enabled, false),
       -- The two portal PINs on file are SHA-256 hashes, not PINs. The new
       -- portal wants four digits, so those accounts import with no PIN and will
       -- need one set — better than importing a credential that cannot work.
       case when c.portal_access_pin ~ '^[0-9]{4}$' then c.portal_access_pin end,
       coalesce(c.created_at, now())
from stage.customers c
left join stage.suburb_map m on m.id = c.suburb_id;

-- ---------------------------------------------------------------- contacts

-- Every source contact keeps its id, including the inactive ones: orders point
-- at them, and an order that cannot name who placed it is worse than a contact
-- nobody rings any more.
insert into public.customer_contacts (id, customer_id, name, phone, email, roles, created_at)
select ct.id, ct.customer_id,
       coalesce(nullif(concat_ws(' ', stage.real(ct.first_name), stage.real(ct.last_name)), ''), 'Contact'),
       stage.real(ct.phone), stage.real(ct.email),
       case when coalesce(ct.is_primary_contact, false)
            then array['Orders'] || case when stage.role_label(ct.contact_role) = 'Contact' then '{}'::text[]
                                         else array[stage.role_label(ct.contact_role)] end
            else array[stage.role_label(ct.contact_role)] end,
       coalesce(ct.created_at, now())
from stage.customer_contacts ct
join public.customers c on c.id = ct.customer_id;

-- The old app stored a person twice over: customer_contacts for everyone else,
-- and first_name/phone/email on the customer row itself for the account's own
-- person. That person becomes a contact here too, unless a contact of the same
-- name is already on file.
with self as (
  select c.id customer_id,
         (md5(c.id::text || ':self'))::uuid contact_id,
         nullif(concat_ws(' ', stage.real(c.first_name), stage.real(c.last_name)), '') nm,
         stage.real(c.phone) phone, stage.real(c.email) email, c.created_at
  from stage.customers c
)
insert into public.customer_contacts (id, customer_id, name, phone, email, roles, created_at)
select s.contact_id, s.customer_id, s.nm, s.phone, s.email,
       -- One contact per account answers the phone about orders, and that is the
       -- one the order screen reaches for first.
       case when exists (select 1 from public.customer_contacts x
                          where x.customer_id = s.customer_id and 'Orders' = any(x.roles))
            then array['Contact'] else array['Orders'] end,
       coalesce(s.created_at, now())
from self s
where s.nm is not null
  and not exists (select 1 from public.customer_contacts x
                   where x.customer_id = s.customer_id and lower(x.name) = lower(s.nm));

-- 52 accounts came out of that with contacts but nobody marked for orders.
-- Every account with anyone on file gets exactly one the order screen can
-- default to.
update public.customer_contacts t set roles = array['Orders'] || array_remove(t.roles, 'Orders')
from (
  select distinct on (customer_id) id from public.customer_contacts
  where customer_id in (
    select c.id from public.customers c
    join public.customer_contacts x on x.customer_id = c.id
    group by c.id having count(*) filter (where 'Orders' = any(x.roles)) = 0)
  order by customer_id, created_at, id
) pick where pick.id = t.id;

-- ---------------------------------------------------------------- orders

create view stage.orders_mapped as
select o.id, trim(o.order_number) order_number,
  (case when o.master_order_id is not null then 'split'
        when exists (select 1 from stage.orders c where c.master_order_id = o.id) then 'master'
        else 'standard' end)::order_kind kind,
  o.master_order_id parent_order_id,
  o.customer_id, o.contact_id,
  case when o.customer_id is null then coalesce(stage.real(o.customer_name), 'Walk-in') end walk_in_name,
  -- back_order has no equivalent here; it is an order that cannot move yet,
  -- which is what on_hold means.
  (case o.status when 'back_order' then 'on_hold' else o.status end)::order_status status,
  (case when o.delivery_method = 'pickup' then 'pickup' else 'delivery' end)::fulfilment_method method,
  stage.real(o.delivery_address) street,
  m.canonical_id suburb_id,
  o.delivery_fee,
  -- The fee belongs to the suburb (§5.8). Rates have moved over the years, so
  -- most historical orders no longer match today's rate; those are marked
  -- manual, which is what stops the app quietly repricing an old delivery.
  (case when s.delivery_fee is not null and o.delivery_fee is not null
             and abs(s.delivery_fee - o.delivery_fee) < 0.005 then 'suburb' else 'manual' end)::fee_source fee_source,
  o.delivery_date,
  nullif(substr(trim(coalesce(o.delivery_time,'')), 1, 5), '') delivery_window,
  coalesce(o.created_at, now()) placed_at,
  -- payment_type and payment_method are different questions (§5.3). Only the
  -- source values that actually answer the first one are carried across; the
  -- rest ("residential", "trade" — those are price lists, not terms) are left
  -- null so the account's own terms decide, via the orders_payment_type trigger.
  (case o.payment_type when '7_day_account' then 'account_7' when '30_day_account' then 'account_30'
        when 'prepaid' then 'prepaid' when 'cod' then 'prepaid' when 'card_on_file' then 'prepaid' end)::payment_type payment_type,
  -- The old app grew a value per till: account_cash, in_yard_cash, pay_credit_card.
  -- They are all one of four ways of paying.
  (case o.payment_method
        when 'cash' then 'cash' when 'account_cash' then 'cash' when 'in_yard_cash' then 'cash'
        when 'card' then 'card' when 'credit_card' then 'card' when 'pay_credit_card' then 'card' when 'in_yard_card' then 'card'
        when 'cod' then 'cod'
        when 'direct_debit' then 'direct_debit' when 'pay_direct_debit' then 'direct_debit'
        when 'on_account' then 'on_account' when 'account' then 'on_account' end)::payment_method payment_method,
  -- overdue is not a state anyone sets: it is invoiced, plus a date that has
  -- passed, and the app works that out from the terms.
  (case o.payment_status when 'paid' then 'paid' when 'invoiced' then 'invoiced'
        when 'overdue' then 'invoiced' else 'pending' end)::payment_status payment_status,
  stage.real(o.purchase_order) po_number,
  stage.real(o.order_notes) order_notes, stage.real(o.delivery_notes) delivery_notes,
  -- The old `adjustments` column is already signed the way adjustment_value is:
  -- it adds to the total. 789 of the 799 non-zero ones reconcile that way.
  case when coalesce(o.adjustments,0) <> 0 then 'amount' end adjustment_type,
  nullif(coalesce(o.adjustments,0), 0) adjustment_value,
  coalesce(o.fuel_surcharge, 0) fuel_surcharge,
  stage.real(o.myob_invoice_number) myob_number,
  case when stage.real(o.myob_invoice_number) is not null then 'invoice' end myob_doc_type,
  -- An order carrying a MYOB invoice number demonstrably went across, so it is
  -- marked as pushed and the duplicate banner will say so.
  case when stage.real(o.myob_invoice_number) is not null then coalesce(o.created_at, now()) end myob_pushed_at,
  o.deleted_at, coalesce(o.created_at, now()) created_at
from stage.orders o
left join stage.suburb_map m on m.id = o.delivery_suburb_id
left join public.suburbs s on s.id = m.canonical_id;

-- Splits point at their master, so masters and standalone orders go in first.
-- truck_id and driver_id are dropped: the old fleet and staff tables are not the
-- ones here, and a foreign key to the wrong truck is worse than no truck.
insert into public.orders
  (id, order_number, kind, parent_order_id, customer_id, contact_id, walk_in_name, status, method,
   street, suburb_id, delivery_fee, fee_source, delivery_date, delivery_window, placed_at,
   payment_type, payment_method, payment_status, po_number, order_notes, delivery_notes,
   adjustment_type, adjustment_value, fuel_surcharge, myob_number, myob_doc_type, myob_pushed_at,
   deleted_at, created_at, updated_at)
select id, order_number, kind, parent_order_id, customer_id, contact_id, walk_in_name, status, method,
   street, suburb_id, delivery_fee, fee_source, delivery_date, delivery_window, placed_at,
   payment_type, payment_method, payment_status, po_number, order_notes, delivery_notes,
   adjustment_type, adjustment_value, fuel_surcharge, myob_number, myob_doc_type, myob_pushed_at,
   deleted_at, created_at, created_at
from stage.orders_mapped where kind <> 'split';

insert into public.orders
  (id, order_number, kind, parent_order_id, customer_id, contact_id, walk_in_name, status, method,
   street, suburb_id, delivery_fee, fee_source, delivery_date, delivery_window, placed_at,
   payment_type, payment_method, payment_status, po_number, order_notes, delivery_notes,
   adjustment_type, adjustment_value, fuel_surcharge, myob_number, myob_doc_type, myob_pushed_at,
   deleted_at, created_at, updated_at)
select id, order_number, kind, parent_order_id, customer_id, contact_id, walk_in_name, status, method,
   street, suburb_id, delivery_fee, fee_source, delivery_date, delivery_window, placed_at,
   payment_type, payment_method, payment_status, po_number, order_notes, delivery_notes,
   adjustment_type, adjustment_value, fuel_surcharge, myob_number, myob_doc_type, myob_pushed_at,
   deleted_at, created_at, created_at
from stage.orders_mapped where kind = 'split';

-- ---------------------------------------------------------------- line items

-- In the new model a master carries no lines of its own — the splits are the
-- order (§5.2). The old app let both hold lines and let them drift apart (§5.1;
-- 24 of the 55 masters holding lines disagreed with their own splits on how much
-- went out). Each master is resolved one way or the other:
--   * splits carry lines  -> the splits are the truth, and the master's own
--                            lines are the pre-split whole, so they are dropped
--   * splits carry none   -> the master's lines are the only record of the
--                            goods, so they move to its first split
create table stage.item_target as
with master as (
  select distinct master_order_id id from stage.orders where master_order_id is not null
),
state as (
  select m.id,
    exists (select 1 from stage.order_items i where i.order_id = m.id) has_own,
    exists (select 1 from stage.order_items i join stage.orders o on o.id = i.order_id
             where o.master_order_id = m.id) splits_have
  from master m
),
rehome as (
  select s.id master_id,
    (select o.id from stage.orders o where o.master_order_id = s.id
      order by (o.deleted_at is not null), o.split_number nulls last, o.created_at, o.id limit 1) first_split
  from state s where s.has_own and not s.splits_have
),
drop_master as (select id from state where has_own and splits_have)
select i.id, coalesce(r.first_split, i.order_id) order_id, i.product_id, i.quantity, i.unit_price, i.created_at
from stage.order_items i
left join rehome r on r.master_id = i.order_id
where i.order_id not in (select id from drop_master);

-- line_total is generated in this schema, so it is left out and computed. It
-- lands on the same number every time: price_adjustment is zero throughout the
-- old data and total_price is quantity × unit_price on all 9679 rows.
insert into public.order_items (id, order_id, product_id, variant_id, description, qty, unit_price, created_at)
select t.id, t.order_id, t.product_id, null, null, t.quantity, t.unit_price, coalesce(t.created_at, now())
from stage.item_target t;

-- About half the old orders were never itemised at all: the order row carried a
-- subtotal and the order_items table had nothing for it. Importing those as they
-- stand would show a $0 order and quietly lose $1.3m of history, so each one
-- gets a single line carrying the recorded amount, named for what it is. Masters
-- are left alone — their total is read from their splits.
insert into public.order_items (order_id, product_id, variant_id, description, qty, unit_price)
select o.id, null, null, 'Goods — not itemised in the previous system', 1, s.subtotal
from public.orders o join stage.orders s on s.id = o.id
where o.kind <> 'master'
  and coalesce(s.subtotal, 0) > 0
  and not exists (select 1 from public.order_items i where i.order_id = o.id);

-- ---------------------------------------------------------- returns, credits

insert into public.order_returns (id, order_id, return_date, returned_items, return_reason, return_notes, status, total_items_returned, processed_at, created_at)
select r.id, r.order_id, coalesce(r.return_date, r.created_at::date, current_date), coalesce(r.returned_items, '[]'::jsonb),
       stage.real(r.return_reason), stage.real(r.return_notes), coalesce(nullif(trim(r.status),''), 'pending'),
       coalesce(r.total_items_returned, 0), r.processed_at, coalesce(r.created_at, now())
from stage.order_returns r;

insert into public.customer_credits (id, customer_id, amount, status, source_order_id, used_in_order_id, created_from_return_id, description, expires_at, created_at)
select c.id, c.customer_id, c.amount, coalesce(nullif(trim(c.status),''), 'available'),
       c.source_order_id, c.used_in_order_id, c.created_from_return_id,
       stage.real(c.description), c.expires_at, coalesce(c.created_at, now())
from stage.customer_credits c;

commit;

-- Afterwards, the pipe was torn down on both ends:
--
--   -- on this project
--   drop schema stage cascade;
--   drop schema src cascade;
--   drop user mapping for current_user server lovable_src;
--   drop server lovable_src cascade;
--   drop extension postgres_fdw cascade;
--
--   -- on the old project
--   revoke all on all tables in schema public from sdp_migration_reader;
--   revoke all on schema public from sdp_migration_reader;
--   drop role sdp_migration_reader;
