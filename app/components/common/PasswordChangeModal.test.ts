import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { PasswordChangeModalExposed } from '#shared/types/components'
import PasswordChangeModal from './PasswordChangeModal.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

const exposedOf = (wrapper: VueWrapper): PasswordChangeModalExposed =>
  wrapper.vm as unknown as PasswordChangeModalExposed

const validPasswordChange = {
  current: 'current-password',
  next: 'new-password-123',
  confirm: 'new-password-123'
}

describe('PasswordChangeModal', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    toastAddMock.mockReset()
    notifyMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('open=true で3つのパスワード入力欄を表示する', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })

    expect(document.body.textContent).toContain('現在のパスワード')
    expect(document.body.textContent).toContain('新しいパスワード')
    expect(document.body.textContent).toContain('新しいパスワード（確認）')
  })

  it('open=false ではフォームを表示しない', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: false }
    })

    expect(document.body.textContent).not.toContain('現在のパスワード')
  })

  it('新しいパスワードだけを API に送信し、成功時に通知して閉じる', async () => {
    fetchMock.mockResolvedValueOnce(null)
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })

    await exposedOf(wrapper).submit(validPasswordChange)

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/update-password', {
      method: 'POST',
      body: { password: validPasswordChange.next }
    })
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'パスワードを変更しました',
      color: 'success'
    })
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })

  it('API 失敗時は useApiError で通知し、モーダルを閉じない', async () => {
    const error = { statusCode: 500 }
    fetchMock.mockRejectedValueOnce(error)
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })

    await exposedOf(wrapper).submit(validPasswordChange)

    expect(notifyMock).toHaveBeenCalledWith(error, {
      fallback: 'パスワードの変更に失敗しました'
    })
    expect(toastAddMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
