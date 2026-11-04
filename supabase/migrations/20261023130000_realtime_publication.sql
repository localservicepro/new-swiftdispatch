-- Live updates between screens.
--
-- "Fix real time updates to remove the need to refresh. Currently if one user
--  makes a change, every other user must refresh to see the update. This is
--  particularly crucial within the dispatch board."
--
-- The app loaded once at sign-in and never heard about anything afterwards.
-- Supabase only broadcasts changes for tables in the supabase_realtime
-- publication, and nothing was in it. These are the tables the screens draw
-- from; settings tables are left out because they change once a year and are
-- re-read on the next sign-in anyway.
--
-- Row-level security applies to what is broadcast, and every one of these
-- tables already grants the app role full access, so the stream is the same
-- data the app can read.

do $$
declare t text;
begin
  foreach t in array array[
    'orders','order_items','customers','customer_contacts','customer_sites',
    'products','product_categories','specials','special_products',
    'suburbs','team_members','trucks','payments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
