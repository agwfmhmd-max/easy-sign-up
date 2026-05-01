-- has_role works fine as SECURITY INVOKER because user_roles RLS allows users to view their own roles,
-- and policies that call has_role(auth.uid(),...) will evaluate against the calling user.
-- But policies using has_role for OTHER users (admin checks) only check the caller's own roles - that's fine.
ALTER FUNCTION public.has_role(uuid, app_role) SECURITY INVOKER;