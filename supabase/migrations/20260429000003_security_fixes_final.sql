-- ================================================================
-- Security fixes part 3: fixes remaining advisor warnings
--
-- Fixes:
--  1. rls_policy_always_true  — split ALL(true) on testing_* tables
--  2. public_bucket_allows_listing — restrict storage SELECT policies
--  3. anon/authenticated_security_definer_function_executable
--       — revoke EXECUTE on handle_new_user, get_company_members_with_email
--         from anon + authenticated; revoke is_admin from anon only
--  4. auth_rls_initplan — replace auth.uid() with (select auth.uid())
--  5. multiple_permissive_policies — consolidate overlapping SELECT policies
--     by dropping Admin ALL → add Admin INSERT/UPDATE/DELETE separately
--  6. Modernise user_metadata-based policies on companies, meetings, tasks,
--     task_comments, project_files, notifications → is_admin() + joins
--
-- NOTE: auth_leaked_password_protection requires enabling HaveIBeenPwned
--       in the Supabase Dashboard → Authentication → Security.
--       authenticated_security_definer_function_executable on is_admin()
--       cannot be removed because authenticated needs EXECUTE for RLS.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. testing_* tables: rls_policy_always_true
--    Replace ALL(true) with scoped SELECT + write policies
-- ----------------------------------------------------------------

-- testing_results: SELECT true is OK; scope writes to folder membership
DROP POLICY IF EXISTS "testing_results_authenticated" ON public.testing_results;
CREATE POLICY "testing_results_select"
  ON public.testing_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "testing_results_insert"
  ON public.testing_results FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.folders f ON f.company_id = cm.company_id
      WHERE f.id = testing_results.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "testing_results_update"
  ON public.testing_results FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.folders f ON f.company_id = cm.company_id
      WHERE f.id = testing_results.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.folders f ON f.company_id = cm.company_id
      WHERE f.id = testing_results.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "testing_results_delete"
  ON public.testing_results FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.folders f ON f.company_id = cm.company_id
      WHERE f.id = testing_results.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- testing_comments: SELECT true is OK; scope writes to author or admin
DROP POLICY IF EXISTS "testing_comments_authenticated" ON public.testing_comments;
CREATE POLICY "testing_comments_select"
  ON public.testing_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "testing_comments_insert"
  ON public.testing_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY "testing_comments_update"
  ON public.testing_comments FOR UPDATE TO authenticated
  USING  (author_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (author_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY "testing_comments_delete"
  ON public.testing_comments FOR DELETE TO authenticated
  USING  (author_id = (SELECT auth.uid()) OR public.is_admin());

-- testing_hidden_steps: service_role bypasses RLS by default in Supabase.
-- Drop the broad ALL(true) policy; add admin-only authenticated policy.
DROP POLICY IF EXISTS "service_role full access" ON public.testing_hidden_steps;
CREATE POLICY "testing_hidden_admin"
  ON public.testing_hidden_steps FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------
-- 2. Storage: fix public_bucket_allows_listing
--    project-files  → {folder_id}/{timestamp}_{filename}
--    ticket-screenshots → {user_id}/{timestamp}.{ext}
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read project files" ON storage.objects;
CREATE POLICY "Members can read project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.company_members cm
        JOIN public.folders f ON f.company_id = cm.company_id
        WHERE f.id::text = (storage.foldername(name))[1]
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Anyone can read ticket screenshots" ON storage.objects;
CREATE POLICY "Authenticated can read ticket screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-screenshots'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );


-- ----------------------------------------------------------------
-- 3. Function permissions
--    handle_new_user   → trigger only, no direct RPC calls needed
--    get_company_members_with_email → service_role only
--    is_admin          → revoke from anon (keep authenticated for RLS)
-- ----------------------------------------------------------------

-- handle_new_user is a trigger function — no user role needs EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- get_company_members_with_email — service_role only
REVOKE ALL  ON FUNCTION public.get_company_members_with_email() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_members_with_email() TO service_role;
-- is_admin: revoke from anon; keep authenticated (required for RLS evaluation)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;


-- ----------------------------------------------------------------
-- 4 + 5 + 6. Modernise remaining tables
--   Pattern: drop Admin ALL (creates SELECT overlap) →
--            single SELECT (is_admin() OR member) +
--            admin-only INSERT/UPDATE/DELETE policies
--   Also: replace auth.uid() with (select auth.uid()) for auth_rls_initplan
-- ----------------------------------------------------------------

-- ---- companies ----
DROP POLICY IF EXISTS "Admin full access on companies"  ON public.companies;
DROP POLICY IF EXISTS "Partners can read own company"   ON public.companies;

CREATE POLICY "companies_select"
  ON public.companies FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = companies.id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "companies_admin_insert"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "companies_admin_update"
  ON public.companies FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "companies_admin_delete"
  ON public.companies FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- meetings ----
DROP POLICY IF EXISTS "Admin full access on meetings"              ON public.meetings;
DROP POLICY IF EXISTS "Partners can read meetings for their projects" ON public.meetings;

CREATE POLICY "meetings_select"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = meetings.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "meetings_admin_insert"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "meetings_admin_update"
  ON public.meetings FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "meetings_admin_delete"
  ON public.meetings FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- tasks ----
DROP POLICY IF EXISTS "Admin full access on tasks"              ON public.tasks;
DROP POLICY IF EXISTS "Partners can read tasks for their projects" ON public.tasks;
DROP POLICY IF EXISTS "Partners can update task status"         ON public.tasks;

CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = tasks.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
-- Partners can update their project tasks; admin can update anything
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = tasks.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = tasks.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "tasks_admin_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "tasks_admin_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- task_comments ----
DROP POLICY IF EXISTS "Admin full access on task_comments"              ON public.task_comments;
DROP POLICY IF EXISTS "Partners can read task comments for their projects" ON public.task_comments;
DROP POLICY IF EXISTS "Partners can create task comments"               ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete own task comments"              ON public.task_comments;

CREATE POLICY "task_comments_select"
  ON public.task_comments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.folders f ON f.id = t.folder_id
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE t.id = task_comments.task_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "task_comments_insert"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.folders f ON f.id = t.folder_id
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE t.id = task_comments.task_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "task_comments_delete"
  ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());


-- ---- project_files ----
DROP POLICY IF EXISTS "Admin full access on project_files"         ON public.project_files;
DROP POLICY IF EXISTS "Partners can read files for their projects"  ON public.project_files;

CREATE POLICY "project_files_select"
  ON public.project_files FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = project_files.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "project_files_admin_insert"
  ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "project_files_admin_update"
  ON public.project_files FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "project_files_admin_delete"
  ON public.project_files FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- notifications ----
-- Users manage own ALL + Admin can insert both cover INSERT → overlap
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR user_id = (SELECT auth.uid()));
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING  (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING  (user_id = (SELECT auth.uid()) OR public.is_admin());


-- ---- comments (auth_rls_initplan) ----
DROP POLICY IF EXISTS "Users can insert own comments"     ON public.comments;
DROP POLICY IF EXISTS "Owner or admin can delete comments" ON public.comments;

CREATE POLICY "Users can insert own comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owner or admin can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());


-- ---- project_members (multiple_permissive + auth_rls_initplan) ----
-- Admin ALL + Users SELECT both cover SELECT → drop Admin ALL
DROP POLICY IF EXISTS "Admin can manage project_members" ON public.project_members;
DROP POLICY IF EXISTS "Users can see own memberships"   ON public.project_members;

CREATE POLICY "Users can see own memberships"
  ON public.project_members FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "project_members_admin_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "project_members_admin_update"
  ON public.project_members FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "project_members_admin_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- company_members (multiple_permissive + auth_rls_initplan) ----
DROP POLICY IF EXISTS "company_members_admin"  ON public.company_members;
DROP POLICY IF EXISTS "company_members_select" ON public.company_members;

CREATE POLICY "company_members_select"
  ON public.company_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY "company_members_admin_insert"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "company_members_admin_update"
  ON public.company_members FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "company_members_admin_delete"
  ON public.company_members FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- folders (multiple_permissive + auth_rls_initplan) ----
DROP POLICY IF EXISTS "Admin can manage folders"      ON public.folders;
DROP POLICY IF EXISTS "Users can read assigned folders" ON public.folders;

-- Single SELECT combining admin, project_members, and company_members
CREATE POLICY "Users can read assigned folders"
  ON public.folders FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = folders.id
        AND pm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = folders.company_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "folders_admin_insert"
  ON public.folders FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "folders_admin_update"
  ON public.folders FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "folders_admin_delete"
  ON public.folders FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- roadmap_items (multiple_permissive + auth_rls_initplan) ----
DROP POLICY IF EXISTS "Admin can manage roadmap_items"  ON public.roadmap_items;
DROP POLICY IF EXISTS "Members can read roadmap_items"  ON public.roadmap_items;

CREATE POLICY "Members can read roadmap_items"
  ON public.roadmap_items FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = roadmap_items.folder_id
        AND pm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = roadmap_items.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "roadmap_items_admin_insert"
  ON public.roadmap_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "roadmap_items_admin_update"
  ON public.roadmap_items FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "roadmap_items_admin_delete"
  ON public.roadmap_items FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- chat_messages (multiple_permissive + auth_rls_initplan) ----
-- Admin ALL + Members SELECT → SELECT overlap
-- Admin ALL + Members INSERT → INSERT overlap
-- Fix: drop Admin ALL; Members policies already include is_admin();
--      add admin-only UPDATE + DELETE.
DROP POLICY IF EXISTS "Admin can manage chat_messages"    ON public.chat_messages;
DROP POLICY IF EXISTS "Members can read chat_messages"    ON public.chat_messages;
DROP POLICY IF EXISTS "Members can insert chat_messages"  ON public.chat_messages;

CREATE POLICY "Members can read chat_messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = chat_messages.folder_id
        AND pm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = chat_messages.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Members can insert chat_messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.folder_id = chat_messages.folder_id
          AND pm.user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = chat_messages.folder_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "chat_messages_admin_update"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "chat_messages_admin_delete"
  ON public.chat_messages FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- documents (multiple_permissive + auth_rls_initplan) ----
-- Admin ALL + authenticated SELECT + partner INSERT/UPDATE → overlaps
-- Fix: drop Admin ALL; keep broad SELECT(true); admin gets separate write policies;
--      partner policies already handle both admin and partners for INSERT.
DROP POLICY IF EXISTS "Admin can manage documents"       ON public.documents;
DROP POLICY IF EXISTS "documents_partner_insert_ticket"  ON public.documents;
DROP POLICY IF EXISTS "documents_partner_update"         ON public.documents;

-- INSERT: admin (any doc_type) OR partner (ticket only)
CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      doc_type = 'ticket'
      AND EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = documents.folder_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );
-- UPDATE: admin (any doc) OR partner (task/ticket only)
CREATE POLICY "documents_update"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      doc_type = ANY (ARRAY['task','ticket'])
      AND EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = documents.folder_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      doc_type = ANY (ARRAY['task','ticket'])
      AND EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = documents.folder_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "documents_admin_delete"
  ON public.documents FOR DELETE TO authenticated
  USING  (public.is_admin());


-- ---- tickets (multiple_permissive + auth_rls_initplan) ----
-- tickets_admin ALL + partner SELECT/INSERT/UPDATE → overlaps
DROP POLICY IF EXISTS "tickets_admin"          ON public.tickets;
DROP POLICY IF EXISTS "tickets_partner_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_partner_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_partner_update" ON public.tickets;

CREATE POLICY "tickets_select"
  ON public.tickets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = tickets.folder_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "tickets_insert"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = tickets.folder_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "tickets_update"
  ON public.tickets FOR UPDATE TO authenticated
  USING  (public.is_admin() OR created_by = (SELECT auth.uid()))
  WITH CHECK (public.is_admin() OR created_by = (SELECT auth.uid()));
CREATE POLICY "tickets_admin_delete"
  ON public.tickets FOR DELETE TO authenticated
  USING  (public.is_admin());
