import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { UserEditModalExposed } from '#shared/types/components'
import type { Profile } from '#shared/types/models'
import UserEditModal from './UserEditModal.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

/** wrapper.vm から defineExpose の API を取り出す helper */
const exposedOf = (w: VueWrapper): UserEditModalExposed =>
  w.vm as unknown as UserEditModalExposed

const sampleUser: Profile = {
  id: 'u1',
  employee_id: 'E001',
  name: '山田 太郎',
  email: 'taro@example.com',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

describe('UserEditModal', () => {
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

  it('open=true で「ユーザーを編集」タイトルが表示される', async () => {
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: true, user: sampleUser }
    })
    expect(document.body.textContent).toContain('ユーザーを編集')
  })

  it('open=false ではフォームが表示されない', async () => {
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: false, user: sampleUser }
    })
    expect(document.body.textContent).not.toContain('ユーザーを編集')
  })

  it('submit で PUT /api/users/[id] を正しいボディで呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce({ ...sampleUser, name: '山田 次郎' })
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: true, user: sampleUser }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '山田 次郎', email: 'taro@example.com', role: 'mentor' })

    expect(fetchMock).toHaveBeenCalledWith('/api/users/u1', {
      method: 'PUT',
      body: { name: '山田 次郎', email: 'taro@example.com', role: 'mentor' }
    })
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '更新しました', color: 'success' })
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
    // 成功時はモーダルを閉じる
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('user が null のとき submit しても $fetch を呼ばない', async () => {
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: true, user: null }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: 'テスト', email: 't@example.com', role: 'admin' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('エラー時は fallback で notify を呼び saved を emit しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: true, user: sampleUser }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '失敗', email: 'fail@example.com', role: 'ojt' })

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fallback: 'ユーザー情報の更新に失敗しました' })
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('失敗時は error トーストのみで success は出さない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    wrapper = await mountSuspended(UserEditModal, {
      props: { open: true, user: sampleUser }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ name: '失敗', email: 'fail@example.com', role: 'ojt' })

    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    )
  })
})
