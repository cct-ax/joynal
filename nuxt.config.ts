// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxtjs/supabase', '@nuxt/eslint', '@vueuse/nuxt'],
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
      exclude: ['/login', '/reset-password']
    },
    types: '#shared/types/database.types.ts'
  }
})
