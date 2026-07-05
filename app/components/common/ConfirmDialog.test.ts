import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

const buttonByLabel = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => button.textContent?.trim() === label)

describe('ConfirmDialog', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('メッセージとカスタムラベルを表示する', async () => {
    wrapper = await mountSuspended(ConfirmDialog, {
      props: {
        open: true,
        title: '日報を削除',
        message: '本当に削除しますか？',
        confirmLabel: '削除する',
        cancelLabel: 'やめる'
      }
    })

    expect(document.body.textContent).toContain('日報を削除')
    expect(document.body.textContent).toContain('本当に削除しますか？')
    expect(buttonByLabel('削除する')).toBeDefined()
    expect(buttonByLabel('やめる')).toBeDefined()
  })

  it('キャンセル時に cancel を emit して閉じる', async () => {
    wrapper = await mountSuspended(ConfirmDialog, {
      props: { open: true, message: '確認メッセージ' }
    })

    buttonByLabel('キャンセル')?.click()
    await nextTick()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })

  it('確認時は confirm を emit し、自動で閉じない', async () => {
    wrapper = await mountSuspended(ConfirmDialog, {
      props: { open: true, message: '確認メッセージ' }
    })

    buttonByLabel('削除')?.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('loading 中はダイアローグの操作ボタンを無効化する', async () => {
    wrapper = await mountSuspended(ConfirmDialog, {
      props: { open: true, message: '確認メッセージ', loading: true }
    })

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(buttons.every(button => button.disabled)).toBe(true)
  })
})
