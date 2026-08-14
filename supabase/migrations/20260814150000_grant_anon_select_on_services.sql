-- `public_services` is declared `security_invoker = true`, so a read through it
-- runs with the caller's privileges. The services table already carries the
-- matching row policy — "Public can read services for published providers",
-- granted to anon, whose predicate is the same setup_complete + publication
-- check the view applies — but anon was never granted SELECT on the table, so
-- the policy could never be reached and every public read failed with
-- "permission denied for table services".
--
-- Granting it lets RLS do the filtering it was written to do. This does not
-- widen what anon can see: without a policy match, a row stays invisible, and
-- the only anon policy on this table is the published-provider one.

grant select on public.services to anon;
