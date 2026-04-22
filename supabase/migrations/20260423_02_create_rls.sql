-- ================================================================
-- Migration: create_rls
-- ヘルパー関数・RLSポリシーの作成
-- ================================================================

-- ----------------------------------------------------------------
-- ヘルパー関数
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_my_trainee(p_trainee_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE (mentor_id = auth.uid() OR ojt_id = auth.uid())
      AND trainee_id = p_trainee_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------
-- profiles RLS
-- ----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------
-- daily_reports RLS
-- ----------------------------------------------------------------
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_reports_select"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_my_trainee(user_id)
  );

CREATE POLICY "daily_reports_insert"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );

CREATE POLICY "daily_reports_update"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );

CREATE POLICY "daily_reports_delete"
  ON public.daily_reports FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );

-- ----------------------------------------------------------------
-- comments RLS
-- ----------------------------------------------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainee_id = auth.uid()
    OR public.is_my_trainee(trainee_id)
  );

CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    commenter_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    AND public.is_my_trainee(trainee_id)
  );

CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (commenter_id = auth.uid())
  WITH CHECK (commenter_id = auth.uid());

-- ----------------------------------------------------------------
-- mentor_assignments RLS
-- ----------------------------------------------------------------
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentor_assignments_select"
  ON public.mentor_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainee_id = auth.uid()
    OR mentor_id = auth.uid()
    OR ojt_id = auth.uid()
  );

CREATE POLICY "mentor_assignments_insert"
  ON public.mentor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "mentor_assignments_update"
  ON public.mentor_assignments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "mentor_assignments_delete"
  ON public.mentor_assignments FOR DELETE
  TO authenticated
  USING (public.is_admin());
