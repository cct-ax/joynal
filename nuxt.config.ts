// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', '@nuxt/eslint'],
  devtools: { enabled: true },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Joynal',
      htmlAttrs: { lang: 'ja' }
    }
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      nodeCompat: true
    }
  },

  typescript: {
    typeCheck: true
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
    types: '~/types/database.types.ts'
  }
})
