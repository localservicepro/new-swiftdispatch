/* Copies the product photographs out of the old Lovable project's storage and
   into this one's.

   The migration brought the image URLs across, but they still pointed at the
   old project's bucket — every picture in the catalogue would have gone dark
   the day that project was shut down. This pulls each file over and rewrites
   the product to the local copy.

   It runs here rather than from a laptop because it is Supabase talking to
   Supabase: no download to anywhere in between, and the service-role key never
   leaves the edge runtime.

   POST with { "limit": 100 } to work through a batch; it reports how many are
   left so it can be called until done. Idempotent — a product already pointing
   at this project's storage is skipped, so re-running costs nothing. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "product-images";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit) || 50, 200);

  /* Anything not already served from this project still needs fetching. */
  const { data: pending, error } = await db
    .from("products")
    .select("id, sku, image_url")
    .not("image_url", "is", null)
    .not("image_url", "like", `${SUPABASE_URL}%`)
    .limit(limit);

  if (error) return json({ error: error.message }, 500);

  const copied: string[] = [];
  const failed: { sku: string; why: string }[] = [];

  for (const p of pending ?? []) {
    try {
      const res = await fetch(p.image_url);
      if (!res.ok) throw new Error(`source responded ${res.status}`);

      const type = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
      const ext = EXT[type];
      if (!ext) throw new Error(`not an image we store (${type})`);

      /* Named for the product, so the bucket is readable and a re-copy
         overwrites rather than accumulating. */
      const path = `${p.id}.${ext}`;
      const { error: upErr } = await db.storage
        .from(BUCKET)
        .upload(path, new Uint8Array(await res.arrayBuffer()), { contentType: type, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
      const { error: setErr } = await db.from("products").update({ image_url: pub.publicUrl }).eq("id", p.id);
      if (setErr) throw setErr;

      copied.push(p.sku);
    } catch (e) {
      failed.push({ sku: p.sku, why: String((e as Error).message || e) });
    }
  }

  const { count: remaining } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .not("image_url", "is", null)
    .not("image_url", "like", `${SUPABASE_URL}%`);

  return json({ copied: copied.length, failed, remaining: remaining ?? 0 });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
