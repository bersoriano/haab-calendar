-- Customer uploads use server-issued, path-scoped signed tokens. No anon or
-- authenticated storage.objects policy grants direct reads of this bucket.
insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  ('deposit-receipts', 'deposit-receipts', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
