import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('open=true でメッセージが表示される', async () => {
    await mountSuspended(ConfirmDialog, {
      props: { open: true, message: '本当に削除しますか？' }
    })
    // UModal は teleport で body へ移すので、document を見る
    expect(document.body.textContent).toContain('本当に削除しますか？')
  })

  it('open=false ではメッセージが表示されない', async () => {
    await mountSuspended(ConfirmDialog, {
      props: { open: false, message: '非表示のはず' }
    })
    expect(document.body.textContent).not.toContain('非表示のはず')
  })

  it('confirmLabel と cancelLabel をカスタムできる', async () => {
    await mountSuspended(ConfirmDialog, {
      props: {
        open: true,
        message: 'カスタムボタン',
        confirmLabel: '実行する',
        cancelLabel: 'やめる'
      }
    })
    expect(document.body.textContent).toContain('実行する')
    expect(document.body.textContent).toContain('やめる')
  })

  it('loading=true のとき確認ボタンが disabled になる（二重送信防止）', async () => {
    await mountSuspended(ConfirmDialog, {
      props: {
        open: true,
        message: '削除しますか？',
        confirmLabel: '削除する',
        cancelLabel: 'やめる',
        loading: true
      }
    })
    // UModal は teleport で body へ移すので document から確認ボタンを探す
    const confirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent?.includes('削除する')
    )
    expect(confirmBtn).toBeTruthy()
    expect(confirmBtn?.disabled).toBe(true)
  })
})
