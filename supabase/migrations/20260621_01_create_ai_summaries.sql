-- ================================================================
-- Migration: create_ai_summaries
-- AI 週次サマリーのキャッシュテーブル＋RLS
-- ================================================================
--
-- audience でメンター視点('mentor')と新人本人視点('self')を分ける。
-- 1 ユーザー・1 週・1 audience につき 1 行（UNIQUE）で upsert する。
-- source_updated_at には生成時点のその週の日報 max(updated_at) を保存し、
-- 閲覧時に最新の日報 max(updated_at) と比較して鮮度（再生成要否）を判定する。

CREATE TABLE public.ai_summaries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start        date        NOT NULL,
  audience          text        NOT NULL CHECK (audience IN ('self', 'mentor')),
  content           text        NOT NULL,
  source_updated_at timestamptz NOT NULL,
  model             text,
  provider          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, audience)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- ai_summaries RLS（comments と同型・audience で self/mentor を分岐）
--   self   行: 新人本人のみ（user_id = auth.uid()）
--   mentor 行: 担当メンター/OJT（is_my_trainee）＋ admin は全て
-- 書き込みは serverSupabaseClient（ユーザー JWT）経由＝RLS 適用。
-- ----------------------------------------------------------------
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_summaries_select"
  ON public.ai_summaries FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );

CREATE POLICY "ai_summaries_insert"
  ON public.ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      audience = 'self'
      AND user_id = auth.uid()
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
    )
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );

CREATE POLICY "ai_summaries_update"
  ON public.ai_summaries FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );
