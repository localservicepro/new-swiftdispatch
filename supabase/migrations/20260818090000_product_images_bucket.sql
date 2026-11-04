-- Where the catalogue photographs live.
--
-- The old app kept an array of image URLs per product and served them from its
-- own storage. The migration took the first of each (481 products had one) and
-- an edge function copied the files over, because URLs pointing at the old
-- project would all have gone dark the day it was switched off.
--
-- Public, because these are pictures of mulch on a public price list and the
-- customer portal shows them to anyone with a PIN. Writes are another matter:
-- no policy grants them, so only the service role — the edge function, and the
-- yard staff acting through it — can put anything in here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,                                   -- 10 MB; the largest we carried over was well under
  array['image/png','image/jpeg','image/webp','image/gif','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
