create table public.payment_receipt_upload_intents (
  storage_path text primary key,
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  issued_at timestamptz not null default now(),
  completed_at timestamptz
);
create index payment_receipt_upload_intents_stale_idx
  on public.payment_receipt_upload_intents(issued_at)
  where completed_at is null;
alter table public.payment_receipt_upload_intents enable row level security;
revoke all on public.payment_receipt_upload_intents from public, anon, authenticated;
grant select, insert, update, delete on public.payment_receipt_upload_intents to service_role;
