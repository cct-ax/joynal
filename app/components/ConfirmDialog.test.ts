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
})
