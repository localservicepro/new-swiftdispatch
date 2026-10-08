-- Whether a product's on-hand figure means anything.
--
-- The catalogue came from an app that never counted stock. Every product was
-- seeded with a round number and decremented as things sold, which is why
-- adding back everything ever sold lands 272 products on exactly 30, 124 on
-- 9,000,000, and the rest on 100, 1000, 5000, 90000 and friends. Not one
-- product in nine hundred sits at zero — the giveaway, since a real yard always
-- has something it has run out of.
--
-- So the dashboard was reporting "8,999,998 each on hand, 8,999,998 days of
-- cover" in good faith on a number that was never a count. There is nothing to
-- correct these to: the true quantities have never been recorded anywhere, and
-- inventing them would be worse than admitting it.
--
-- This column lets the app say "not tracked" instead of a fiction. The old
-- figures stay in `stock` rather than being zeroed — they are meaningless but
-- they are not ours to destroy, and nothing reads them while this is false.
-- Someone counting a product for real sets its figure and turns this on.
alter table public.products
  add column if not exists track_stock boolean not null default true;

comment on column public.products.track_stock is
  'Whether the on-hand figure means anything. False for products carried over from the old app, which seeded stock rather than counting it.';

update public.products set track_stock = false;
