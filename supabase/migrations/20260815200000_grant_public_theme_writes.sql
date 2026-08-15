-- 20260815192227 narrowed provider writes to an explicit column list, which is
-- the right shape — but it was written before public_theme existed, so an owner
-- choosing a theme would be refused at the grant. Theme is an owner-editable
-- presentation field, so it joins the list rather than the protected set.

grant insert (public_theme) on table public.providers to authenticated;
grant update (public_theme) on table public.providers to authenticated;
