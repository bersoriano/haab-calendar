-- One provider profile per authenticated owner.
--
-- The application has always assumed this: the dashboard reads a provider with
-- maybeSingle(), publication and demo-edit code key providers by owner, and the
-- write path picked the oldest row when it found several. Nothing in the
-- database said so, so two concurrent first-time setups could each observe "no
-- provider" and insert one.
--
-- This migration states the invariant in Postgres. It does not clean anything
-- up: choosing which of an owner's rows is canonical, and what happens to the
-- services, bookings, holds, redirects and images hanging off the others, is a
-- product decision and not one a migration should make silently.

-- Preflight. Refuses to proceed rather than failing halfway through on the
-- constraint itself, and reports only a count — provider ids, slugs and owner
-- ids stay out of the error, which is read by whoever runs the deploy.
do $$
declare
  duplicate_owner_count bigint;
begin
  select count(*)
  into duplicate_owner_count
  from (
    select owner_user_id
    from public.providers
    group by owner_user_id
    having count(*) > 1
  ) duplicates;

  if duplicate_owner_count > 0 then
    raise exception
      'Cannot enforce one provider per owner: % owner(s) have duplicate provider rows. Reconcile them before applying this migration.',
      duplicate_owner_count
      using hint = 'Audit with: select owner_user_id, count(*), array_agg(id order by created_at, id) from public.providers group by owner_user_id having count(*) > 1;';
  end if;
end
$$;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so the guard is explicit and
-- the migration stays re-runnable.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'providers_owner_user_id_unique'
      and conrelid = 'public.providers'::regclass
  ) then
    alter table public.providers
      add constraint providers_owner_user_id_unique unique (owner_user_id);
  end if;
end
$$;

-- The unique constraint's own index serves every lookup the plain index served,
-- including the foreign-key scan it was added for in 20260712164229. Keeping
-- both would mean two indexes maintained on every write for one access path.
drop index if exists public.providers_owner_user_id_idx;

-- Untouched on purpose: the foreign key to auth.users(id) and its cascade
-- delete, every row policy on public.providers, and the column-level grants
-- from 20260815192227. This migration adds an invariant; it does not widen or
-- narrow who may read or write.
