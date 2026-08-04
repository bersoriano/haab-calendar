-- The security-invoker public views evaluate publication status from the
-- provider owner. Anonymous readers need this column privilege for that view
-- predicate; RLS still limits direct reads to published provider rows only.
grant select (owner_user_id) on public.providers to anon;
