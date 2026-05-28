import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { PasswordChangeModalExposed } from '~/types/components'
import PasswordChangeModal from './PasswordChangeModal.vue'

// useToast はテスト環境では UI に出ないので、呼び出しを spy する
const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

/** wrapper.vm から defineExpose の API を取り出す helper（キャストはここに集約） */
const exposedOf = (w: VueWrapper): PasswordChangeModalExposed =>
  w.vm as unknown as PasswordChangeModalExposed

describe('PasswordChangeModal', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    toastAddMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    // teleport 先（document.body）の DOM をテスト間で隔離する
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('open=true で 3 フィールドのフォームが表示される', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })
    expect(document.body.textContent).toContain('現在のパスワード')
    expect(document.body.textContent).toContain('新しいパスワード')
    expect(document.body.textContent).toContain('新しいパスワード（確認）')
  })

  it('open=false ではフォームが表示されない', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: false }
    })
    expect(document.body.textContent).not.toContain('現在のパスワード')
  })

  it('submit で POST /api/auth/update-password を新パスワードのみで呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce(null)
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ current: 'oldpass', next: 'newpass123', confirm: 'newpass123' })

    // current / confirm は送らず、新パスワードのみを password として送る
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/update-password', {
      method: 'POST',
      body: { password: 'newpass123' }
    })
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'パスワードを変更しました', color: 'success' })
    )
    // 成功時はモーダルを閉じる（update:open=false を emit）
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('失敗時は error トーストを出し success トーストは出さない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ current: 'oldpass', next: 'newpass123', confirm: 'newpass123' })

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'パスワードの変更に失敗しました', color: 'error' })
    )
    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    )
  })
})
