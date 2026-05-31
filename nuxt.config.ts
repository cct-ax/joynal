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

  routeRules: {
    '/login': { ssr: false },
    '/forgot-password': { ssr: false },
    '/reset-password': { ssr: false },
    '/confirm': { ssr: false }
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      nodeCompat: true
    }
  },

  vite: {
    optimizeDeps: {
      include: [
        '@iconify/vue',
        '@internationalized/date',
        'zod'
      ]
    }
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
      // /reset-password はリカバリーリンク着地ページ。コード交換前は未認証のため、
      // 除外しないと交換完了前に /login へ弾かれる。/forgot-password は申請（メール送信）画面。
      exclude: ['/login', '/forgot-password', '/reset-password']
    },
    types: '#shared/types/database.types.ts'
  }
})
