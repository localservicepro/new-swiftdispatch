/* Putting a photograph on a product.

   The file goes to the `product-image` edge function, not to storage. The app
   talks to Postgres as anon and that key ships in the JavaScript bundle, so a
   bucket the app could write to directly was a bucket anyone could write to,
   under any name they liked. The function takes a file and hands back a URL:
   the caller does not choose the bucket, the path or the name, and the key that
   could reach anything else never leaves the edge runtime. */

import { supabase } from "../lib/supabase";

/* Checked here as well as in the function, so an obviously wrong file is
   refused before it is uploaded rather than after. The function is the one that
   actually enforces it — this is only to save the round trip. */
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

export async function uploadProductImage(file: File): Promise<UploadResult> {
  const reason = rejectReason(file);
  if (reason) return { error: reason };

  const form = new FormData();
  form.append("file", file);

  const { data, error } = await supabase.functions.invoke("product-image", { body: form });
  if (error) return { error: await readError(error) };
  if (data?.error) return { error: String(data.error) };
  if (!data?.url) return { error: "The upload finished but no address came back for the file." };
  return { url: String(data.url) };
}

/* Clearing or replacing a photograph takes the old file with it, so the bucket
   does not fill up with pictures nothing points at. A failure is not worth
   interrupting anyone over — a stray file costs storage, not correctness. */
export async function deleteProductImage(url: string | null | undefined) {
  if (!url) return;
  await supabase.functions.invoke("product-image", { body: { action: "delete", url } });
}

/* An edge function that answers with a non-2xx status gives supabase-js a
   FunctionsHttpError whose message is just "Edge Function returned a non-2xx
   status code" — the sentence explaining what was actually wrong is in the
   response body, so it is worth digging out. */
async function readError(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    /* Not JSON, or no body — fall through to whatever the client said. */
  }
  return String(error?.message || error);
}
