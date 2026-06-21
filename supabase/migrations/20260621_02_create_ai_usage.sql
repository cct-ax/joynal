-- ================================================================
-- Migration: create_ai_usage
-- AI 呼び出しの per-user 日次カウント（ソフトレート上限・コスト/無料枠保護）
-- ================================================================
--
-- coach / weekly-summary が AI を呼ぶ前に当日の count を確認し、上限内なら +1 する。
-- user_id + usage_date で 1 行（upsert）。RLS は本人のみ書き込み可（admin は閲覧可）。

CREATE TABLE public.ai_usage (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date        NOT NULL,
  count      integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 本人は自分の利用状況を読める。admin は監視のため全件読める。
CREATE POLICY "ai_usage_select"
  ON public.ai_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 本人のみ自分の行を作成・更新できる（serverSupabaseClient のユーザー JWT 経由）。
CREATE POLICY "ai_usage_insert"
  ON public.ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_usage_update"
  ON public.ai_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
