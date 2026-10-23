/* Photographs for the product catalogue, uploaded and removed through here
   rather than straight into storage.

   The Products screen used to write to the bucket itself, which meant the
   bucket had to be writable by the app's anon role — and the anon key ships in
   the JavaScript bundle. Anyone who read it could put a file anywhere in that
   bucket under any name. Nothing here changes who may call this function, but
   it changes what a caller can do: they hand over a file and get a URL back.
   They do not choose the bucket, the path, or the name, and they cannot reach
   any other bucket at all, because the key that can do those things stays in
   the edge runtime and never goes near a browser.

   POST multipart/form-data with a `file` field to upload.
   POST { "action": "delete", "url": "…" } to remove one.

   Deleting checks the URL is a file in this bucket before touching it, so a
   caller cannot aim it at something else. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "product-images";
const MAX_BYTES = 10 * 1024 * 1024;

/* The same allowlist the bucket enforces, checked here so a rejected file gets
   a sentence someone can act on rather than a bare 400 from storage. */
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const contentType = req.headers.get("content-type") ?? "";

  /* ---------- remove ---------- */
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (body.action !== "delete") return json({ error: "Unknown action." }, 400);

    const path = pathInBucket(String(body.url ?? ""));
    if (!path) return json({ error: "That URL is not a file in this catalogue's bucket." }, 400);

    const { error } = await db.storage.from(BUCKET).remove([path]);
    if (error) return json({ error: error.message }, 500);
    return json({ removed: path });
  }

  /* ---------- upload ---------- */
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "Send the file as multipart/form-data." }, 415);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file came through." }, 400);

  const ext = EXT[file.type];
  if (!ext) return json({ error: `${file.type || "That file"} is not an image we store — use PNG, JPG, WEBP, GIF or AVIF.` }, 415);
  if (file.size > MAX_BYTES) {
    return json({ error: `That file is ${(file.size / 1048576).toFixed(1)}MB. The limit is ${MAX_BYTES / 1048576}MB.` }, 413);
  }

  /* The name is ours, not the caller's: a fresh one every time, so nothing can
     be overwritten by guessing a path and a replaced photograph cannot be
     served stale from a cache still holding the old one. */
  const name = `${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(name, new Uint8Array(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return json({ error: error.message }, 500);

  const { data } = db.storage.from(BUCKET).getPublicUrl(name);
  return json({ url: data.publicUrl });
});

/* The storage path a public URL points at, but only when it really is one of
   ours — anything else comes back null and is refused. */
function pathInBucket(url: string): string | null {
  const marker = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(marker)) return null;
  const path = decodeURIComponent(url.slice(marker.length).split("?")[0]);
  /* No traversal, no leading slash — a plain file name in the bucket root. */
  if (!path || path.includes("/") || path.includes("..")) return null;
  return path;
}
