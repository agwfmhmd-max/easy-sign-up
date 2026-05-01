
-- Fix search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke public execute on SECURITY DEFINER functions (only triggers/internal use)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role still needs to be callable by authenticated for RLS evaluation? No — RLS evaluates as definer of policy via auth.uid(); but policies use it inline. Re-grant to authenticated since policies reference it.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
