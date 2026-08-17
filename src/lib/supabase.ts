import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/* PostgREST answers with at most a thousand rows and says nothing about the
   ones it left behind — a select that used to return the whole table starts
   returning the first page of it the day the table outgrows the cap, and the
   only symptom is a ledger that quietly stops in 2023.

   The yard has ten thousand orders and fourteen thousand line items, so every
   table-wide read goes through here instead: it asks for one page more than it
   needs and keeps going until a page comes back short.

   The builder is re-ranged on each pass, so pass a fresh one — `pageAll(() =>
   supabase.from("orders").select("*").order("placed_at"))` — not a query that
   has already been awaited. Ordering is not optional: without it Postgres is
   free to return rows in a different order per page, and pages would overlap
   and skip. */
const PAGE = 1000;

export async function pageAll<T = any>(
  build: () => any,
  page = PAGE
): Promise<{ data: T[] | null; error: any }> {
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build().range(from, from + page - 1);
    if (error) return { data: null, error };
    out.push(...((data || []) as T[]));
    if (!data || data.length < page) return { data: out, error: null };
  }
}

/* The same problem one step along: fetching the line items for a list of
   orders. PostgREST puts an `in` list in the query string, and the yard's
   biggest account has two and a half thousand orders — ninety kilobytes of
   URL, which no proxy will carry. The list goes over in chunks, each of them
   paged. */
export async function fetchIn<T = any>(
  table: string,
  column: string,
  ids: string[],
  chunk = 200
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data } = await pageAll<T>(() =>
      supabase.from(table).select("*").in(column, slice).order("id")
    );
    out.push(...(data || []));
  }
  return out;
}
