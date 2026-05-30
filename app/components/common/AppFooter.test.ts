import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppFooter from './AppFooter.vue'

describe('AppFooter', () => {
  it('サブテキストと現在年のコピーライトを表示する', async () => {
    const wrapper = await mountSuspended(AppFooter)
    const text = wrapper.text()
    expect(text).toContain('新人研修日報管理')
    expect(text).toContain(`© ${new Date().getFullYear()} Joynal`)
  })
})
