import type { ViteConfig } from 'nuxt/schema'

// Vite ビルドの onwarn 型（Rollup の WarningHandlerWithDefault）。vite/rollup は
// pnpm 非ホイストで直接 import できないため、解決可能な Nuxt の設定型から導出する。
type RollupOnwarn = NonNullable<NonNullable<NonNullable<ViteConfig['build']>['rollupOptions']>['onwarn']>

// @tailwindcss/vite と nuxt:module-preload-polyfill は変換時に sourcemap を emit
// しないため、Rollup の SOURCEMAP_BROKEN 警告が出る（生成 CSS / module preload
// polyfill 注入が対象で実害なし）。ソースマップ生成自体は維持しつつこの警告だけ握りつぶす。
// UNUSED_EXTERNAL_IMPORT は Nuxt がサーバービルドの onwarn で既定抑制している警告
// （nitro/runtime 等の external 由来）。サーバー側 onwarn を差し替えると既定が失われる
// ため同等に抑制する（client では発生しないので共通化して問題ない）。
const onwarn: RollupOnwarn = (warning, defaultHandler) => {
  if (warning.code === 'SOURCEMAP_BROKEN' || warning.code === 'UNUSED_EXTERNAL_IMPORT') return
  defaultHandler(warning)
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxtjs/supabase', '@nuxt/eslint', '@vueuse/nuxt'],

  // ドメイン別サブフォルダ(report/admin/common)で整理しつつ、名前は据え置く
  // （pathPrefix:false ＝ <UserTable> 等のまま・使用箇所は無変更）。
  components: [{ path: '~/components', pathPrefix: false }],
  devtools: { enabled: true },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Joynal',
      htmlAttrs: { lang: 'ja' }
    }
  },

  css: ['~/assets/css/main.css'],

  // AI 機能（コーチング・週次サマリー）のプロバイダ設定。
  // 値は NUXT_* 環境変数で上書きする（runtimeConfig 直下＝サーバー専用でクライアントに露出しない）。
  // 既定プロバイダは Anthropic（Claude Haiku 4.5）。OpenAI・Gemini も同一アダプタ（server/utils/aiChat）で利用可。
  // Gemini は OpenAI 互換エンドポイント経由（provider='gemini'）。
  runtimeConfig: {
    anthropicApiKey: '', // NUXT_ANTHROPIC_API_KEY
    openaiApiKey: '', // NUXT_OPENAI_API_KEY
    geminiApiKey: '', // NUXT_GEMINI_API_KEY
    aiProvider: 'anthropic', // NUXT_AI_PROVIDER（'anthropic' | 'openai' | 'gemini'）
    anthropicModel: 'claude-haiku-4-5-20251001', // NUXT_ANTHROPIC_MODEL
    openaiModel: 'gpt-4o-mini', // NUXT_OPENAI_MODEL
    geminiModel: 'gemini-2.5-flash', // NUXT_GEMINI_MODEL
    aiMaxTokens: 1024 // NUXT_AI_MAX_TOKENS
  },

  routeRules: {
    '/login': { ssr: false },
    '/reset-password': { ssr: false },
    '/confirm': { ssr: false }
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      nodeCompat: true
    },
    // 各 server/api ハンドラの defineRouteMeta({ openAPI }) から OpenAPI を生成する。
    experimental: { openAPI: true },
    openAPI: {
      production: false,
      meta: {
        title: 'Joynal API',
        version: '1.0.0',
        description: 'Joynal（新人日報アプリ）の社内向け API ドキュメント。dev 限定。'
      },
      route: '/_docs/openapi.json',
      ui: {
        scalar: {
          route: '/_docs/scalar'
        },
        swagger: {
          route: '/_docs/swagger'
        }
      }
    }
  },

  vite: {
    optimizeDeps: {
      include: [
        '@internationalized/date',
        'zod'
      ]
    },
    // SSR バンドル（500KB超）はエッジで1回読むだけでクライアント性能に無関係なため、
    // 既定 500KB の閾値を引き上げてチャンクサイズ警告を抑制する。
    build: {
      chunkSizeWarningLimit: 1000
    },
    // Nuxt はクライアント/サーバーで別々の Vite ビルドを回し、サーバービルドには独自
    // onwarn を設定する。トップレベル onwarn ではサーバー側に届かないため、$client/
    // $server 双方で差し替える（onwarn 本体はファイル冒頭で定義）。
    $client: { build: { rollupOptions: { onwarn } } },
    $server: { build: { rollupOptions: { onwarn } } }
  },

  typescript: {
    typeCheck: false
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // /reset-password は OTP 方式の申請〜コード入力〜新パスワード設定を 1 画面で行う未認証ページ。
      // 除外しないと未ログイン状態で /login へ弾かれてしまう。
      exclude: ['/login', '/reset-password']
    },
    types: '#shared/types/database.types.ts'
  }
})
