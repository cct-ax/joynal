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

  it('emoji プロップで絵文字を表示する', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { emoji: '📋', message: '選んでください' }
    })
    expect(wrapper.text()).toContain('📋')
  })

  it('icon が指定されると svg が描画される（emoji 非表示）', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { icon: 'lucide:inbox', message: '何もありません' }
    })
    // @iconify/vue は <svg> を描画する（fetch 前は空 svg）
    expect(wrapper.find('svg').exists()).toBe(true)
    // emoji プロップ用の div は出ない
    expect(wrapper.text()).not.toContain('📋')
  })

  it('slot 内容を表示する', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { emoji: '📋', message: 'メッセージ' },
      slots: { default: () => '<button>追加</button>' }
    })
    expect(wrapper.text()).toContain('追加')
  })
})
