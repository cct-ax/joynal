-- ================================================================
-- Migration: restrict_profiles_email
-- email を一般ユーザー（authenticated / anon）から隠す（PII 保護）。
--
-- profiles_select は USING(true) で名前・ロール等の参照を許可しているが、これは email まで
-- 露出させる（公開 anon key + 自分の JWT による直接 REST で全ユーザーの email を取得可能）。
-- カラム権限で email だけを authenticated から除外する。
-- 名前・社員ID・ロール等は引き続き参照可（コメント著者名・割り当て表示・社員ID採番に必要）。
-- email を要する管理者操作（一覧・作成・更新）はサーバー側で service role 経由に変更済み。
-- ================================================================

REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (id, employee_id, name, role, is_active, created_at, updated_at)
  ON public.profiles TO authenticated;
