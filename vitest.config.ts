import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom'
      }
    },
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', '.nuxt', 'dist'],
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
