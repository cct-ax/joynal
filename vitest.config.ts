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
    exclude: ['node_modules', '.nuxt', 'dist']
  }
})
