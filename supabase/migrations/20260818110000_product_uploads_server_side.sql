-- Take the bucket's write grant back off the app.
--
-- 20260818093000 let anon write to product-images so the Products screen could
-- upload a photograph. That worked, but the anon key ships inside the
-- JavaScript bundle: anyone who read it could put a file anywhere in the bucket
-- under any name they chose.
--
-- Uploads now go through the `product-image` edge function, which holds the
-- service-role key server-side and picks the bucket, the path and the file name
-- itself. The service role is not subject to RLS, so it needs no policy here —
-- which means these three can simply go, and the bucket is left readable by
-- everyone and writable by nothing that runs in a browser.
--
-- Reads are unaffected: the bucket is public, and storage serves a public
-- bucket's files without consulting a policy at all.
drop policy if exists "app uploads product images" on storage.objects;
drop policy if exists "app replaces product images" on storage.objects;
drop policy if exists "app removes product images" on storage.objects;
