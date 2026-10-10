import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EmptyState from './EmptyState.vue'

describe('EmptyState', () => {
  it('メッセージを表示する', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { message: 'まだデータがありません' }
    })
    expect(wrapper.text()).toContain('まだデータがありません')
  })

  it('icon が指定されると UIcon を描画する', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { icon: 'i-lucide-inbox', message: '何もありません' }
    })
    const icon = wrapper.findComponent({ name: 'UIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('name')).toBe('i-lucide-inbox')
  })

  it('icon 未指定なら UIcon を描画しない', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { message: '何もありません' }
    })
    expect(wrapper.findComponent({ name: 'UIcon' }).exists()).toBe(false)
  })

  it('slot 内容を表示する', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { message: 'メッセージ' },
      slots: { default: () => '<button>追加</button>' }
    })
    expect(wrapper.text()).toContain('追加')
  })
})
