import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CoachHints from './CoachHints.vue'

describe('CoachHints', () => {
  it('質問リストと feedback を表示する', async () => {
    const wrapper = await mountSuspended(CoachHints, {
      props: { hints: { questions: ['質問A', '質問B'], feedback: '励ましの一言' } }
    })

    const text = wrapper.text()
    expect(text).toContain('質問A')
    expect(text).toContain('質問B')
    expect(text).toContain('励ましの一言')

    wrapper.unmount()
  })

  it('feedback が空なら質問のみ表示する', async () => {
    const wrapper = await mountSuspended(CoachHints, {
      props: { hints: { questions: ['質問A'], feedback: '' } }
    })

    expect(wrapper.text()).toContain('質問A')

    wrapper.unmount()
  })
})
