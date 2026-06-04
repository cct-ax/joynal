import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 設定。
 *
 * 前提:
 *   - `@playwright/test` は devDependency（package.json は別途追加される）。
 *   - ローカル Supabase が起動している（`supabase start` → API は既定で http://localhost:54321）。
 *     テストユーザー / 割り当ては supabase/seed.sql が投入する。
 *
 * webServer:
 *   本番相当の挙動を検証するため dev サーバーではなく `pnpm build && pnpm preview` で起動する。
 *   Supabase の接続先（URL / 公開鍵 / サーバー用 secret key）は env から渡し、ハードコードしない。
 *     - CI: `supabase status` 由来の値をワークフローが process.env に流す。
 *     - ローカル: .env（または手動 export）の値が process.env 経由で渡る。
 *   変数名は本プロジェクトの runtimeConfig 規約に合わせる:
 *     NUXT_PUBLIC_SUPABASE_URL / NUXT_PUBLIC_SUPABASE_KEY（@nuxtjs/supabase が読む public 設定）
 *     NUXT_SUPABASE_SECRET_KEY（server 側の service role キー。/api/users 等で使用）
 */

// 本番相当ビルドのプレビュー URL。baseURL と webServer.url を 1 箇所に集約する。
const BASE_URL = 'http://localhost:3000'

// Nuxt の preview がポート 3000 で待受けるよう明示する（pnpm preview ＝ nuxt preview）。
// 環境差で別ポートに割り当たると webServer.url の待機がタイムアウトするのを防ぐ。
export default defineConfig({
  testDir: './e2e',

  // CI で .only の置き忘れを失敗扱いにする。
  forbidOnly: !!process.env.CI,

  // CI のみリトライ。trace は on-first-retry なので最初の失敗で再実行時に採取される。
  retries: process.env.CI ? 2 : 0,

  // 認証セッション / seed データを共有するため直列実行（テスト間の DB 競合を避ける）。
  workers: 1,
  fullyParallel: false,

  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'pnpm build && pnpm preview',
    url: BASE_URL,
    // ローカルでは既に起動済みのサーバーを再利用する。CI では毎回起動する。
    reuseExistingServer: !process.env.CI,
    // build + preview の立ち上がりを待つため長めに取る。
    timeout: 180 * 1000,
    // Supabase 接続情報はハードコードせず env から透過的に渡す。
    env: {
      NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY ?? '',
      NUXT_SUPABASE_SECRET_KEY: process.env.NUXT_SUPABASE_SECRET_KEY ?? ''
    }
  }
})
