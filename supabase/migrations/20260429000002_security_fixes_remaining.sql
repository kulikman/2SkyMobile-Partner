-- ================================================================
-- Security fixes part 2: remaining RLS policies that reference
-- user_metadata insecurely. Replaces jwt()->user_metadata checks
-- with public.is_admin() (created in 20260429000001).
-- Safe to run even if some policies were already fixed.
-- ================================================================

-- ----------------------------------------------------------------
-- public.folders
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Admin can manage folders" ON public.folders;
CREATE POLICY "Admin can manage folders"
  ON public.folders FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

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
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = folders.id
        AND pm.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- public.project_members
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Users can see own memberships" ON public.project_members;
CREATE POLICY "Users can see own memberships"
  ON public.project_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin can manage project_members" ON public.project_members;
CREATE POLICY "Admin can manage project_members"
  ON public.project_members FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------
-- public.roadmap_items
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Members can read roadmap_items" ON public.roadmap_items;
CREATE POLICY "Members can read roadmap_items"
  ON public.roadmap_items FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = roadmap_items.folder_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = roadmap_items.folder_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage roadmap_items" ON public.roadmap_items;
CREATE POLICY "Admin can manage roadmap_items"
  ON public.roadmap_items FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------
-- public.chat_messages
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Members can read chat_messages" ON public.chat_messages;
CREATE POLICY "Members can read chat_messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.folder_id = chat_messages.folder_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = chat_messages.folder_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert chat_messages" ON public.chat_messages;
CREATE POLICY "Members can insert chat_messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.folder_id = chat_messages.folder_id
          AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.folders f
        JOIN public.company_members cm ON cm.company_id = f.company_id
        WHERE f.id = chat_messages.folder_id
          AND cm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can manage chat_messages" ON public.chat_messages;
CREATE POLICY "Admin can manage chat_messages"
  ON public.chat_messages FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------
-- public.documents — partner policies (created outside migrations)
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "documents_partner_insert_ticket" ON public.documents;
CREATE POLICY "documents_partner_insert_ticket"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = documents.folder_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents_partner_update" ON public.documents;
CREATE POLICY "documents_partner_update"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = documents.folder_id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      JOIN public.company_members cm ON cm.company_id = f.company_id
      WHERE f.id = documents.folder_id
        AND cm.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- Re-apply fixes from part 1 (idempotent — safe to run again)
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Admin can manage documents" ON public.documents;
CREATE POLICY "Admin can manage documents"
  ON public.documents FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Owner or admin can delete comments" ON public.comments;
CREATE POLICY "Owner or admin can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin can manage invitations" ON public.invitations;
CREATE POLICY "Admin can manage invitations"
  ON public.invitations FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "company_members_select" ON public.company_members;
CREATE POLICY "company_members_select"
  ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "company_members_admin" ON public.company_members;
CREATE POLICY "company_members_admin"
  ON public.company_members FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tickets_admin" ON public.tickets;
CREATE POLICY "tickets_admin"
  ON public.tickets FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
