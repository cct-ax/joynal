import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// テストは実 Supabase に接続しない。URL/KEY が未設定だと @nuxtjs/supabase が
//   - ビルド時: `[warn] Missing NUXT_PUBLIC_SUPABASE_URL/KEY`
//   - 実行時 (コンポーネントの mountSuspended): supabase.client プラグインが
//     createBrowserClient(url, key) で throw し `[nuxt] error caught ...` を stderr に出す
// を出す。テストを密閉化するため、実 env が設定済みでも常にダミー値で固定して両ノイズを抑止する。
process.env.NUXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NUXT_PUBLIC_SUPABASE_KEY = 'test-anon-key'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom'
      }
    },
    // 各 server/api ハンドラの top-level defineRouteMeta（Nitro ビルドマクロ・テスト環境に無い）の
    // ReferenceError を防ぐため no-op を global 登録する。
    setupFiles: ['./server/test/setup.ts'],
    // テストで意図的に発生させる既知のノイズのみ抑止する（console 呼び出し自体は妨げないので spy/アサートは可能）。
    onConsoleLog: (log: string): boolean | undefined => {
      // 1) Vue が <Suspense>(mountSuspended) 使用時に console.info で出す実験的機能の注意書き
      if (log.includes('<Suspense> is an experimental feature')) {
        return false
      }
      // 2) server ハンドラがエラー経路テスト(意図的な 4xx/5xx)で出す console.error('[api/...]', error)
      if (log.trimStart().startsWith('[api/')) {
        return false
      }
    },
    include: ['**/*.test.ts', '**/*.spec.ts'],
    // e2e/ は Playwright(@playwright/test)用。Vitest が拾うと test() が衝突して落ちるため除外。
    exclude: ['node_modules', '.nuxt', 'dist', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', '.nuxt', 'dist', '**/*.config.*', 'shared/types/**', 'server/test/**']
    }
  },
  // server ハンドラ/ユーティリティのテスト用に #supabase/server をスタブへ解決する。
  // vitest の nuxt(app) 環境には Nitro の #supabase/server エイリアスが無いため。
  // （ユーザーの server コードのみが #supabase/server を import するので既存テストには影響しない）
  resolve: {
    alias: {
      '#supabase/server': fileURLToPath(new URL('./server/test/supabase-server-stub.ts', import.meta.url))
    }
  }
})
