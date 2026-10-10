import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import AuthCard from './AuthCard.vue'

describe('AuthCard', () => {
  it('default スロット（フォーム本体）を描画する', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      slots: { default: () => h('div', { class: 'login-form' }, 'ログインフォーム') }
    })
    expect(wrapper.find('.login-form').exists()).toBe(true)
    expect(wrapper.text()).toContain('ログインフォーム')
  })

  it('title 未指定（既定の空文字）ではブランド見出しを描画しない', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      slots: { default: () => h('div', 'body') }
    })
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('title を渡すとブランド見出しを描画する', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      props: { title: 'Joynal' },
      slots: { default: () => h('div', 'body') }
    })
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toBe('Joynal')
  })

  it('subtitle は title があるときのみ描画する', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      props: { title: 'Joynal', subtitle: '新人研修日報管理' },
      slots: { default: () => h('div', 'body') }
    })
    expect(wrapper.text()).toContain('新人研修日報管理')
  })

  it('title が無ければ subtitle も描画しない（見出しブロックごと非表示）', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      props: { subtitle: '新人研修日報管理' },
      slots: { default: () => h('div', 'body') }
    })
    expect(wrapper.text()).not.toContain('新人研修日報管理')
  })

  it('header スロットを渡すとカード内ヘッダー領域に描画する', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      slots: {
        header: () => h('h2', 'パスワードリセット'),
        default: () => h('div', 'body')
      }
    })
    expect(wrapper.text()).toContain('パスワードリセット')
  })

  it('footer スロットを渡すとカード内フッター領域に描画する', async () => {
    const wrapper = await mountSuspended(AuthCard, {
      slots: {
        default: () => h('div', 'body'),
        footer: () => h('a', { href: '/reset-password' }, 'パスワードを忘れた方')
      }
    })
    const link = wrapper.find('a[href="/reset-password"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('パスワードを忘れた方')
  })
})
