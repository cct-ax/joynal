-- ================================================================
-- Migration: harden_profiles_and_functions
-- 1) profiles の UPDATE 権限を一般ユーザーから剥奪し、自己権限昇格を防ぐ（CRITICAL）。
--    Supabase 既定で authenticated はテーブル UPDATE（全カラム）を持ち、profiles_update が
--    `id = auth.uid()` を許すため、公開 anon key + 自分の JWT の直接 REST で
--    `PATCH /rest/v1/profiles?id=eq.<self> {"role":"admin"}` が通り自己昇格できた。
--    プロフィール編集は全て管理者→service role 経由のため、剥奪しても機能影響なし。
--    （migration 20260529_01 の email SELECT 制限と同じ「カラム/権限で締める」アプローチ）
-- 2) SECURITY DEFINER 関数の search_path を固定（MEDIUM ハードニング）。
-- ================================================================

-- 1) 自己権限昇格の遮断
REVOKE UPDATE ON public.profiles FROM authenticated, anon;

-- ポリシーも実態（管理者のみ更新）に合わせて簡素化。REVOKE と二重の防御
-- （将来 UPDATE を再付与しても非管理者を弾く）。
ALTER POLICY "profiles_update" ON public.profiles
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2) SECURITY DEFINER 関数の search_path 固定
--    本文は public. 修飾済み・now() は pg_catalog で常時可のため空 search_path で安全。
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_my_trainee(uuid) SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
