-- ================================================================
-- E2E / ローカル開発用シードデータ
--
-- `supabase db reset` および `supabase start` 実行時に、migrations 適用後へ
-- 自動で流し込まれる（config.toml の既定 seed パス）。本番には適用しない。
--
-- 目的: E2E（Playwright）が実 RLS 越しに動作確認できるよう、ロールの異なる
--       テストユーザーと担当割り当てを SQL で投入する。
--
-- 設計上の注意:
--   * profiles は「管理者の招待でのみ作成される」設計（profiles_insert は is_admin() のみ許可）。
--     よって E2E では通常フローを経ずに auth.users と profiles を直接 INSERT する。
--   * auth.users を SQL で直接作る際、confirmation_token 等の token 系列を NULL のまま
--     にすると GoTrue（Auth）がログイン時に 401 を返す既知の挙動がある。空文字 '' を入れる。
--   * パスワードは crypt(... , gen_salt('bf')) で bcrypt ハッシュ化して保存する。
--     平文はこの SQL に直書きしない（下のコメントとテスト側の定数で管理する）。
--   * ID は固定のシード UUID。アプリの ID 検証は z.guid()（UUID 形状のみ・RFC のバージョン
--     nibble は問わない）なので、末尾を判別しやすくした下記の固定 UUID で問題ない。
--   * email/パスワードの対応（テスト用途・E2E spec 側の定数と一致させること）:
--       trainee : trainee@e2e.test  / Passw0rd!e2e   role=trainee
--       mentor  : mentor@e2e.test   / Passw0rd!e2e   role=mentor
--       admin   : admin@e2e.test    / Passw0rd!e2e   role=admin
--     ※ 共通パスワード文字列は seed と e2e/fixtures.ts の 1 箇所ずつにのみ存在する。
--
-- 冪等性: db reset は毎回まっさらな DB に適用されるが、`supabase start` の再適用に
--         備えて ON CONFLICT DO NOTHING / DO UPDATE を付ける。
-- ================================================================

-- ----------------------------------------------------------------
-- 1) auth.users（GoTrue の認証ユーザー）
-- ----------------------------------------------------------------
-- token 系（confirmation_token / recovery_token / email_change_token_*）は空文字。
-- email_confirmed_at を now() で埋め、確認済みユーザーとしてログイン可能にする。
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'trainee@e2e.test',
    crypt('Passw0rd!e2e', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'mentor@e2e.test',
    crypt('Passw0rd!e2e', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'admin@e2e.test',
    crypt('Passw0rd!e2e', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 2) auth.identities（email プロバイダの identity）
-- ----------------------------------------------------------------
-- signInWithPassword は email identity を介してユーザーを解決する。
-- provider_id は email provider では user の id（テキスト）を使うのが GoTrue の慣例。
-- identity_data には sub / email を含める（GoTrue が参照する）。
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"trainee@e2e.test","email_verified":true,"phone_verified":false}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"mentor@e2e.test","email_verified":true,"phone_verified":false}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@e2e.test","email_verified":true,"phone_verified":false}',
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ----------------------------------------------------------------
-- 3) public.profiles（アプリのプロフィール）
-- ----------------------------------------------------------------
-- id は auth.users.id と一致させる（FK）。email も auth.users に揃える。
INSERT INTO public.profiles (id, employee_id, name, email, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'E2E-T001', 'E2E 新人', 'trainee@e2e.test', 'trainee', true),
  ('22222222-2222-2222-2222-222222222222', 'E2E-M001', 'E2E メンター', 'mentor@e2e.test', 'mentor', true),
  ('33333333-3333-3333-3333-333333333333', 'E2E-A001', 'E2E 管理者', 'admin@e2e.test', 'admin', true)
ON CONFLICT (id) DO UPDATE
  SET employee_id = EXCLUDED.employee_id,
      name        = EXCLUDED.name,
      email       = EXCLUDED.email,
      role        = EXCLUDED.role,
      is_active   = EXCLUDED.is_active;

-- ----------------------------------------------------------------
-- 4) public.mentor_assignments（メンター ⇄ 新人の割り当て）
-- ----------------------------------------------------------------
-- mentor が trainee を担当する割り当て。週次コメントの E2E（mentor が担当新人へ
-- コメント upsert）に必要。
-- year は現在のカレンダー年に合わせる。server の resolveYear() が
-- new Date().getFullYear() を既定に使うため、年度ハードコードだと将来ずれる。
INSERT INTO public.mentor_assignments (trainee_id, mentor_id, ojt_id, year)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    EXTRACT(YEAR FROM now())::int
  )
ON CONFLICT (trainee_id, year) DO UPDATE
  SET mentor_id = EXCLUDED.mentor_id,
      ojt_id    = EXCLUDED.ojt_id;
