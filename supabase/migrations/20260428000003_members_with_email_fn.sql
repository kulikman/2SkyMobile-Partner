-- Function to fetch all company members with their auth email in one query.
-- SECURITY DEFINER lets it join auth.users (normally inaccessible via RLS).
CREATE OR REPLACE FUNCTION public.get_company_members_with_email()
RETURNS TABLE (
  id         uuid,
  company_id uuid,
  user_id    uuid,
  email      text,
  role       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    cm.id,
    cm.company_id,
    cm.user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'viewer') AS role
  FROM public.company_members cm
  JOIN auth.users au ON au.id = cm.user_id
  ORDER BY cm.created_at;
$$;

-- Only admins may call this function
REVOKE ALL ON FUNCTION public.get_company_members_with_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_members_with_email() TO service_role;
