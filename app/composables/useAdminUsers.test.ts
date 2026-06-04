import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { Profile } from '#shared/types/models'
import { useAdminUsers } from './useAdminUsers'

// useRequestFetch が返す fetch を spy 化して呼び出し内容を検証する。
const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

// useApiError の notify をスパイする。
const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

const sampleUsers: Profile[] = [
  {
    id: 'u1',
    employee_id: 'E001',
    name: '山田 太郎',
    email: 'taro@example.com',
    role: 'trainee',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'u2',
    employee_id: 'E002',
    name: '佐藤 花子',
    email: 'hanako@example.com',
    role: 'mentor',
    is_active: false,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z'
  }
]

let wrapper: VueWrapper | null = null

const mountAdminUsers = async () => {
  let exposed: ReturnType<typeof useAdminUsers> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useAdminUsers()
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useAdminUsers>
}

describe('useAdminUsers', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    requestFetchMock.mockReset()
    notifyMock.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    clearNuxtData('admin-users')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
    clearNuxtData('admin-users')
  })

  it('GET /api/users を叩いてユーザー一覧を返す', async () => {
    requestFetchMock.mockResolvedValueOnce(sampleUsers)

    const { users } = await mountAdminUsers()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/users')
    expect(users.value).toHaveLength(2)
    expect(users.value[0]?.employee_id).toBe('E001')
  })

  describe('create', () => {
    it('POST /api/users を正しいボディで呼び、成功時に true を返す', async () => {
      requestFetchMock.mockResolvedValueOnce([])
      fetchMock.mockResolvedValueOnce(sampleUsers[0])
      // refresh のための再フェッチ
      requestFetchMock.mockResolvedValueOnce(sampleUsers)

      const { create } = await mountAdminUsers()
      const result = await create({ name: '山田 太郎', employee_id: 'E010', email: 'taro@example.com', role: 'trainee' })

      expect(fetchMock).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        body: { name: '山田 太郎', employee_id: 'E010', email: 'taro@example.com', role: 'trainee' }
      })
      expect(result).toBe(true)
    })

    it('409 エラー時に専用メッセージで notify を呼び false を返す', async () => {
      requestFetchMock.mockResolvedValueOnce([])
      fetchMock.mockRejectedValueOnce({ statusCode: 409 })

      const { create } = await mountAdminUsers()
      const result = await create({ name: '重複', employee_id: 'E011', email: 'dup@example.com', role: 'trainee' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusMessages: { 409: 'このメールアドレスは既に登録されています' }
        })
      )
      expect(result).toBe(false)
    })

    it('一般エラー時に fallback メッセージで notify を呼び false を返す', async () => {
      requestFetchMock.mockResolvedValueOnce([])
      fetchMock.mockRejectedValueOnce({ statusCode: 500 })

      const { create } = await mountAdminUsers()
      const result = await create({ name: '失敗', employee_id: 'E012', email: 'fail@example.com', role: 'mentor' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fallback: 'ユーザーの追加に失敗しました' })
      )
      expect(result).toBe(false)
    })
  })

  describe('update', () => {
    it('PUT /api/users/[id] を正しいボディで呼び、成功時に true を返す', async () => {
      requestFetchMock.mockResolvedValue(sampleUsers)
      fetchMock.mockResolvedValueOnce(sampleUsers[0])

      const { update } = await mountAdminUsers()
      const result = await update('u1', { name: '山田 次郎' })

      expect(fetchMock).toHaveBeenCalledWith('/api/users/u1', {
        method: 'PUT',
        body: { name: '山田 次郎' }
      })
      expect(result).toBe(true)
    })

    it('エラー時に fallback で notify を呼び false を返す', async () => {
      requestFetchMock.mockResolvedValueOnce([])
      fetchMock.mockRejectedValueOnce({ statusCode: 500 })

      const { update } = await mountAdminUsers()
      const result = await update('u1', { role: 'admin' })

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fallback: 'ユーザー情報の更新に失敗しました' })
      )
      expect(result).toBe(false)
    })
  })

  describe('setActive', () => {
    it('is_active=false で PUT /api/users/[id] を呼ぶ', async () => {
      requestFetchMock.mockResolvedValue(sampleUsers)
      fetchMock.mockResolvedValueOnce(sampleUsers[0])

      const { setActive } = await mountAdminUsers()
      const result = await setActive('u1', false)

      expect(fetchMock).toHaveBeenCalledWith('/api/users/u1', {
        method: 'PUT',
        body: { is_active: false }
      })
      expect(result).toBe(true)
    })

    it('is_active=true で PUT /api/users/[id] を呼ぶ', async () => {
      requestFetchMock.mockResolvedValue(sampleUsers)
      fetchMock.mockResolvedValueOnce(sampleUsers[1])

      const { setActive } = await mountAdminUsers()
      const result = await setActive('u2', true)

      expect(fetchMock).toHaveBeenCalledWith('/api/users/u2', {
        method: 'PUT',
        body: { is_active: true }
      })
      expect(result).toBe(true)
    })

    it('エラー時に fallback で notify を呼び false を返す', async () => {
      requestFetchMock.mockResolvedValueOnce([])
      fetchMock.mockRejectedValueOnce({ statusCode: 500 })

      const { setActive } = await mountAdminUsers()
      const result = await setActive('u1', false)

      expect(notifyMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fallback: 'ユーザーの無効化に失敗しました' })
      )
      expect(result).toBe(false)
    })
  })
})
