// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', '@nuxt/eslint'],
  devtools: { enabled: true },
  compatibilityDate: '2025-07-15',
  nitro: {
    preset: 'cloudflare-pages',
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/reset-password'],
    },
    types: '~/types/database.types.ts',
  },
})
