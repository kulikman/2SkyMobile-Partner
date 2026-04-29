-- ================================================================
-- Security fixes for Supabase advisor warnings
-- 1. Replace profiles SECURITY DEFINER view with a proper table
-- 2. Enable RLS on testing_results and testing_comments
-- 3. Replace insecure user_metadata RLS checks with is_admin()
-- ================================================================


-- ----------------------------------------------------------------
-- 1. profiles: drop view → create table → backfill → RLS
-- ----------------------------------------------------------------

DROP VIEW IF EXISTS public.profiles;

CREATE TABLE IF NOT EXISTS public.profiles (
  id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text
);

-- Backfill existing users
INSERT INTO public.profiles (id, email)
  SELECT id, email FROM auth.users
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all profiles (needed for comment author display)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Trigger: keep profiles in sync when new users are created/updated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-point comments.user_id FK to profiles so PostgREST join works
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ----------------------------------------------------------------
-- 2. Enable RLS on testing_results and testing_comments
-- ----------------------------------------------------------------

ALTER TABLE public.testing_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testing_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testing_results_authenticated"  ON public.testing_results;
CREATE POLICY "testing_results_authenticated"
  ON public.testing_results FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "testing_comments_authenticated" ON public.testing_comments;
CREATE POLICY "testing_comments_authenticated"
  ON public.testing_comments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ----------------------------------------------------------------
-- 3. SECURITY DEFINER helper: reads role from auth.users directly
--    (avoids insecure jwt() user_metadata checks in RLS policies)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
  );
$$;

REVOKE ALL  ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ----------------------------------------------------------------
-- 4. Replace user_metadata RLS checks with is_admin()
-- ----------------------------------------------------------------

-- documents
DROP POLICY IF EXISTS "Admin can manage documents" ON public.documents;
CREATE POLICY "Admin can manage documents"
  ON public.documents FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- comments
DROP POLICY IF EXISTS "Owner or admin can delete comments" ON public.comments;
CREATE POLICY "Owner or admin can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- invitations
DROP POLICY IF EXISTS "Admin can manage invitations" ON public.invitations;
CREATE POLICY "Admin can manage invitations"
  ON public.invitations FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- company_members
DROP POLICY IF EXISTS "company_members_select" ON public.company_members;
CREATE POLICY "company_members_select"
  ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "company_members_admin" ON public.company_members;
CREATE POLICY "company_members_admin"
  ON public.company_members FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- folders
DROP POLICY IF EXISTS "Users can read assigned folders" ON public.folders;
CREATE POLICY "Users can read assigned folders"
  ON public.folders FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = folders.company_id
        AND cm.user_id = auth.uid()
    )
  );

-- tickets
DROP POLICY IF EXISTS "tickets_admin" ON public.tickets;
CREATE POLICY "tickets_admin"
  ON public.tickets FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
