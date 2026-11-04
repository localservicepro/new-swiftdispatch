-- Cards in a board column, in the order the yard wants them.
--
-- "Ability to move order cards up and down each column — manually move orders
-- up and down based on their priority."
--
-- A column is ordered by delivery window, which is right until the 11 o'clock
-- that has to go before the 9 o'clock because the crane truck is only free
-- now. One nullable number per order: ranked cards come first in rank order,
-- everything else follows by delivery time as before. Cleared when the order
-- changes stage, because a priority is a priority within a column.

alter table public.orders
  add column if not exists board_rank numeric;

comment on column public.orders.board_rank is
  'Manual position within its dispatch-board column, lowest first. Null means "where the delivery time puts it". Cleared on a stage change.';
