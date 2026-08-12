create table public.account_deletion_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null unique,
  blob_urls text[] not null check (cardinality(blob_urls) > 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_cleanup_jobs enable row level security;

revoke all on public.account_deletion_cleanup_jobs
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.account_deletion_cleanup_jobs
  to service_role;

create trigger account_deletion_cleanup_jobs_set_updated_at
  before update on public.account_deletion_cleanup_jobs
  for each row
  execute function private.set_updated_at();
