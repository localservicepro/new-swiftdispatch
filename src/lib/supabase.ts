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
   supabase.from("orders").select("*", { count: "exact" }).order("placed_at"))` —
   not a query that has already been awaited. Ordering is not optional: without
   it Postgres is free to return rows in a different order per page, and pages
   would overlap and skip.

   Walking the pages one after another is what made signing in take twenty
   seconds: seventeen round trips for the line items alone, each waiting on the
   last, and nothing on screen until the final one landed. Ask for the count
   alongside the first page and every remaining page can be fetched at once
   instead — seventeen trips become two, and the browser was always going to
   open six connections whether we used them or not.

   Pass `{ count: "exact" }` to get that. Without it there is no way to know how
   many pages there are until a short one arrives, and the walk stays serial. */
const PAGE = 1000;
/* Browsers cap concurrent connections per host at six. Asking for more just
   queues them, and a queued request is a serial one wearing a hat. */
const LANES = 6;

export async function pageAll<T = any>(
  build: () => any,
  page = PAGE
): Promise<{ data: T[] | null; error: any }> {
  const first = await build().range(0, page - 1);
  if (first.error) return { data: null, error: first.error };
  const out = ((first.data || []) as T[]).slice();
  if (out.length < page) return { data: out, error: null };

  const total: number | null = typeof first.count === "number" ? first.count : null;
  if (total === null) {
    /* No count was asked for, so fall back to the serial walk — correct, just
       slower. */
    for (let from = page; ; from += page) {
      const { data, error } = await build().range(from, from + page - 1);
      if (error) return { data: null, error };
      out.push(...((data || []) as T[]));
      if (!data || data.length < page) return { data: out, error: null };
    }
  }

  const starts: number[] = [];
  for (let from = page; from < total; from += page) starts.push(from);

  /* Promise.all preserves order, and the batches run in order, so rows arrive
     in the same sequence the serial walk produced. */
  for (let i = 0; i < starts.length; i += LANES) {
    const batch = starts.slice(i, i + LANES);
    const results = await Promise.all(batch.map((f) => build().range(f, f + page - 1)));
    for (const r of results) {
      if (r.error) return { data: null, error: r.error };
      out.push(...((r.data || []) as T[]));
    }
  }
  return { data: out, error: null };
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
