-- Provider and service slug triggers call this helper as the requesting role.
-- Keep the helper in the private schema while allowing the roles that can
-- legitimately write those records to execute it.
grant execute on function private.slugify(text) to authenticated, service_role;
