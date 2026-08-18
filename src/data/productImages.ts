/* Putting a photograph on a product.

   The catalogue's pictures came over from the old app, but there was no way to
   add one from in here — a URL field would have meant hosting the file
   somewhere else first, which is not a thing anyone at a garden supplies yard
   should have to do. This uploads the file into the project's own bucket and
   hands back the URL to store on the product. */

import { supabase } from "../lib/supabase";

export const BUCKET = "product-images";

/* Matches the bucket's own limits, so a file that would be refused server-side
   is refused here instead — with a sentence rather than a 400. */
export const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const ACCEPT = Object.keys(TYPES).join(",");

export function rejectReason(file: File): string | null {
  if (!TYPES[file.type]) return `${file.name} is not an image we can store — use a PNG, JPG, WEBP, GIF or AVIF.`;
  if (file.size > MAX_BYTES)
    return `${file.name} is ${(file.size / 1048576).toFixed(1)}MB. The limit is ${MAX_BYTES / 1048576}MB — try a smaller copy.`;
  return null;
}

export interface UploadResult {
  url?: string;
  error?: string;
}

/* Uploads under a fresh random name rather than the product's id: a product
   being created has no id yet, and a new name means a replaced photograph
   cannot be served stale from a cache that still holds the old one. */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  const reason = rejectReason(file);
  if (reason) return { error: reason };

  const ext = TYPES[file.type];
  const name = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return { url: data.publicUrl };
}

/* Clearing or replacing a photograph takes the old file with it, so the bucket
   does not fill up with pictures nothing points at. Only ever deletes from this
   project's own bucket — a URL pointing anywhere else is left alone, and a
   failure here is not worth interrupting anyone over: a stray file costs
   storage, not correctness. */
export async function deleteProductImage(url: string | null | undefined) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return;
  const path = url.slice(at + marker.length).split("?")[0];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
}
