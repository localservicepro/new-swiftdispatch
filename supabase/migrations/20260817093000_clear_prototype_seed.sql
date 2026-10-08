-- Clear the prototype seed now that the yard's own records are in.
--
-- 20260814110442_seed_data.sql filled the catalogue, the customer book and the
-- order history with the rows from the design prototype — six suburbs around
-- Geelong, nine products, a dozen orders. That was the right thing to build
-- against and the wrong thing to keep once 2,323 real customers and 10,043 real
-- orders landed on top of it: a fresh environment replaying the migrations would
-- otherwise come up with Torquay and Belmont sitting in the same suburb list as
-- the real delivery zones, and Marcus Hale in the same customer book as the real
-- account holders.
--
-- The seed used fixed UUIDs, one prefix per table, so the prototype rows are
-- named exactly rather than guessed at. Only the tables the real data replaced
-- are touched — the trucks, the team and their sign-in PINs, and the business,
-- payment and email settings all stay. Those are the yard's live configuration,
-- not prototype filler, and the old app has nothing to replace them with.
--
-- Children first, so the foreign keys stay satisfied on the way down.

delete from public.payments          where order_id::text like '01000000-0000-4000-8000-%';
delete from public.statements        where customer_id::text like 'f0000000-0000-4000-8000-%';
delete from public.order_items       where order_id::text like '01000000-0000-4000-8000-%';
delete from public.orders            where id::text like '01000000-0000-4000-8000-%';
delete from public.customer_sites    where customer_id::text like 'f0000000-0000-4000-8000-%';
delete from public.customer_contacts where id::text like 'f1000000-0000-4000-8000-%';
delete from public.customers         where id::text like 'f0000000-0000-4000-8000-%';
delete from public.special_products  where special_id::text like 'b1000000-0000-4000-8000-%';
delete from public.specials          where id::text like 'b1000000-0000-4000-8000-%';
delete from public.product_variants  where id::text like 'c1000000-0000-4000-8000-%';
delete from public.products          where id::text like 'c0000000-0000-4000-8000-%';
delete from public.product_categories where id::text like 'b0000000-0000-4000-8000-%';
delete from public.suburbs           where id::text like 'a0000000-0000-4000-8000-%';
