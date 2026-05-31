import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { UserFormModalExposed } from '#shared/types/components'
import type { Profile } from '#shared/types/models'
import UserFormModal from './UserFormModal.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

/** wrapper.vm から defineExpose の API を取り出す helper */
const exposedOf = (w: VueWrapper): UserFormModalExposed =>
  w.vm as unknown as UserFormModalExposed

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

describe('UserFormModal', () => {
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

  // ----------------------------------------------------------------
  // 招待モード（user なし）
  // ----------------------------------------------------------------
  describe('招待モード（user なし）', () => {
    it('open=true で「ユーザーを招待」タイトルが表示される', async () => {
      wrapper = await mountSuspended(UserFormModal, { props: { open: true } })
      expect(document.body.textContent).toContain('ユーザーを招待')
    })

    it('open=false ではフォームが表示されない', async () => {
      wrapper = await mountSuspended(UserFormModal, { props: { open: false } })
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
      wrapper = await mountSuspended(UserFormModal, { props: { open: true } })
      const vm = exposedOf(wrapper)

      await vm.submit({ name: '田中 一郎', employee_id: 'E003', email: 'ichiro@example.com', role: 'trainee' })

      expect(fetchMock).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        body: { name: '田中 一郎', employee_id: 'E003', email: 'ichiro@example.com', role: 'trainee' }
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
      wrapper = await mountSuspended(UserFormModal, { props: { open: true } })
      const vm = exposedOf(wrapper)

      await vm.submit({ name: '重複ユーザー', employee_id: 'E099', email: 'dup@example.com', role: 'mentor' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusMessages: { 409: 'このメールアドレスは既に登録されています' },
          codeMessages: { EMPLOYEE_ID_TAKEN: 'この社員IDは既に使用されています' }
        })
      )
      expect(wrapper.emitted('saved')).toBeUndefined()
    })

    it('一般エラー時は招待 fallback トーストを出し saved は emit しない', async () => {
      fetchMock.mockRejectedValueOnce({ statusCode: 500 })
      wrapper = await mountSuspended(UserFormModal, { props: { open: true } })
      const vm = exposedOf(wrapper)

      await vm.submit({ name: '失敗', employee_id: 'E100', email: 'fail@example.com', role: 'ojt' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fallback: 'ユーザーの追加に失敗しました' })
      )
      expect(wrapper.emitted('saved')).toBeUndefined()
      // エラー時はモーダルを閉じない
      expect(wrapper.emitted('update:open')?.find(e => Array.isArray(e) && e[0] === false)).toBeUndefined()
    })
  })

  // ----------------------------------------------------------------
  // 編集モード（user あり）
  // ----------------------------------------------------------------
  describe('編集モード（user あり）', () => {
    it('open=true で「ユーザーを編集」タイトルが表示される', async () => {
      wrapper = await mountSuspended(UserFormModal, {
        props: { open: true, user: sampleUser }
      })
      expect(document.body.textContent).toContain('ユーザーを編集')
    })

    it('submit で PUT /api/users/[id] を正しいボディで呼ぶ', async () => {
      fetchMock.mockResolvedValueOnce({ ...sampleUser, name: '山田 次郎' })
      wrapper = await mountSuspended(UserFormModal, {
        props: { open: true, user: sampleUser }
      })
      const vm = exposedOf(wrapper)

      await vm.submit({ name: '山田 次郎', employee_id: 'E001', email: 'taro@example.com', role: 'mentor' })

      expect(fetchMock).toHaveBeenCalledWith('/api/users/u1', {
        method: 'PUT',
        body: { name: '山田 次郎', employee_id: 'E001', email: 'taro@example.com', role: 'mentor' }
      })
      expect(toastAddMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: '更新しました', color: 'success' })
      )
      expect(wrapper.emitted('saved')).toBeTruthy()
      // 成功時はモーダルを閉じる
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('エラー時は更新 fallback で notify を呼び saved を emit しない', async () => {
      fetchMock.mockRejectedValueOnce({ statusCode: 500 })
      wrapper = await mountSuspended(UserFormModal, {
        props: { open: true, user: sampleUser }
      })
      const vm = exposedOf(wrapper)

      await vm.submit({ name: '失敗', employee_id: 'E001', email: 'fail@example.com', role: 'ojt' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fallback: 'ユーザー情報の更新に失敗しました' })
      )
      expect(wrapper.emitted('saved')).toBeUndefined()
    })

    it('自分自身を編集中は役割セレクトが disabled になる', async () => {
      // 自己降格（最後の admin 喪失）を UI でも防ぐ。
      wrapper = await mountSuspended(UserFormModal, {
        props: { open: true, user: sampleUser, currentUserId: sampleUser.id }
      })
      const roleSelect = wrapper.findAllComponents({ name: 'USelectMenu' })[0]
      expect(roleSelect?.props('disabled')).toBe(true)
    })

    it('別ユーザー編集時は役割セレクトが活性のまま', async () => {
      wrapper = await mountSuspended(UserFormModal, {
        props: { open: true, user: sampleUser, currentUserId: 'other-id' }
      })
      const roleSelect = wrapper.findAllComponents({ name: 'USelectMenu' })[0]
      expect(roleSelect?.props('disabled')).toBe(false)
    })
  })
})
