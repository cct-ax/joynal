import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { UserAddModalExposed } from '#shared/types/components'
import UserAddModal from './UserAddModal.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

/** wrapper.vm から defineExpose の API を取り出す helper */
const exposedOf = (w: VueWrapper): UserAddModalExposed =>
  w.vm as unknown as UserAddModalExposed

describe('UserAddModal', () => {
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

  it('open=true で「ユーザーを招待」タイトルが表示される', async () => {
    wrapper = await mountSuspended(UserAddModal, { props: { open: true } })
    expect(document.body.textContent).toContain('ユーザーを招待')
  })

  it('open=false ではフォームが表示されない', async () => {
    wrapper = await mountSuspended(UserAddModal, { props: { open: false } })
    expect(document.body.textContent).not.toContain('ユーザーを招待')
  })

  it('submit で POST /api/users を正しいボディで呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce({
      id: 'new-user',
      employee_id: 'E003',
      name: '田中 一郎',
      email: 'ichiro@example.com',
      role: 'trainee',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    })
    wrapper = await mountSuspended(UserAddModal, { props: { open: true } })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '田中 一郎', email: 'ichiro@example.com', role: 'trainee' })

    expect(fetchMock).toHaveBeenCalledWith('/api/users', {
      method: 'POST',
      body: { name: '田中 一郎', email: 'ichiro@example.com', role: 'trainee' }
    })
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '招待しました', color: 'success' })
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
    // 成功時はモーダルを閉じる
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('409 エラーで専用メッセージを表示し saved は emit しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 409 })
    wrapper = await mountSuspended(UserAddModal, { props: { open: true } })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '重複ユーザー', email: 'dup@example.com', role: 'mentor' })

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusMessages: { 409: 'このメールアドレスは既に登録されています' }
      })
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('一般エラー時は fallback トーストを出し saved は emit しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    wrapper = await mountSuspended(UserAddModal, { props: { open: true } })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '失敗', email: 'fail@example.com', role: 'ojt' })

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fallback: 'ユーザーの追加に失敗しました' })
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
    // エラー時はモーダルを閉じない
    expect(wrapper.emitted('update:open')?.find(e => Array.isArray(e) && e[0] === false)).toBeUndefined()
  })

  it('成功トーストの色は success のみで error は出さない', async () => {
    fetchMock.mockResolvedValueOnce({
      id: 'u99', employee_id: 'E099', name: 'テスト', email: 't@example.com',
      role: 'admin', is_active: true, created_at: '', updated_at: ''
    })
    wrapper = await mountSuspended(UserAddModal, { props: { open: true } })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: 'テスト', email: 't@example.com', role: 'admin' })

    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ color: 'error' })
    )
  })
})
