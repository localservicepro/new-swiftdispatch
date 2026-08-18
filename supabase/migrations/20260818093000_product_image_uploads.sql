-- Let the yard put a photograph on a product from inside the app.
--
-- Until now the only writer to this bucket was the edge function that carried
-- the old catalogue's pictures over, which runs as the service role and answers
-- to no policy. Uploading from the Products screen needs an actual grant.
--
-- The grant matches how every other table in this project is reached: the app
-- signs in on a staff PIN of its own and talks to Postgres as anon, so that is
-- who has to be allowed. What keeps this from being an open file host is the
-- bucket itself — 10MB a file and images only, both enforced by storage before
-- any policy is consulted — and the fact that these policies name one bucket,
-- so anon still cannot write anywhere else.
create policy "app uploads product images"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'product-images');

create policy "app replaces product images"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- Replacing a photograph should take the old file with it rather than leaving
-- the bucket to fill up with pictures nothing points at.
create policy "app removes product images"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'product-images');
