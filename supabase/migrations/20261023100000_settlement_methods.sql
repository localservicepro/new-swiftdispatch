-- Settlement, the way the yard actually settles.
--
-- Two rows off the change sheet. "Change settlement methods to: In-Yard, Card,
-- Cash On Delivery and Direct Deposit — as of currently it is extremely
-- convoluted." And: "add 7 Day Account and Card On File to how a customer
-- pays; when creating an order for such a customer it must auto fill the
-- settlement method, and these customers must be colour coded on the board."
--
-- The enum keeps every value it had — ten thousand migrated orders say 'cash'
-- and history has to go on reading — and gains the three the yard named that it
-- did not have. Which values the app offers on a new order is the app's
-- business; this only makes them storable.
--
--   in_yard         paid at the counter before the goods leave
--   direct_deposit  bank transfer. 'direct_debit' already existed and is a
--                   different thing, so it stays for the 21 orders that carry it
--   account_7       a seven-day account. 'on_account' remains the thirty-day one

alter type public.payment_method add value if not exists 'in_yard';
alter type public.payment_method add value if not exists 'direct_deposit';
alter type public.payment_method add value if not exists 'account_7';

-- "Card on file" is a fact about the customer, not a billing relationship: the
-- yard holds a card and charges it after delivery. They are not account
-- customers — no terms, no statement — so billing stays 'prepaid' and this flag
-- is what makes a new order default to settling by the card on file.
alter table public.customers
  add column if not exists card_on_file boolean not null default false;

comment on column public.customers.card_on_file is
  'The yard holds a card for this customer and charges it after delivery. New orders default to settling by card on file; the board colours them apart.';
