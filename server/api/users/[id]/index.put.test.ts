import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../../test/supabaseMock'
import '../../../test/serverGlobals'
import handler from './index.put'

const readBodyMock = vi.fn()
const getRouterParamMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

// 自分自身（caller）の id。route param と一致させると「自己更新」になる。
const selfId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'

/** caller のロールを返す user client をモックする */
const mockCaller = (role: string) => {
  vi.mocked(serverSupabaseClient).mockResolvedValue(
    createSupabaseClientMock({ data: { role }, error: null }).client as never
  )
}

/**
 * service role 経由の update 結果をモックする。
 * email 同期・ban で使う auth.admin.updateUserById も併設し、その spy を返す。
 * authResult で auth 側の戻り（既定 success）を差し替えられる。
 */
const mockServiceUpdate = (
  result: QueryResult,
  authResult: { error: unknown } = { error: null }
) => {
  const mock = createSupabaseClientMock(result)
  const updateUserById = vi.fn(() => Promise.resolve(authResult))
  const serviceClient = { ...mock.client, auth: { admin: { updateUserById } } }
  vi.mocked(serverSupabaseServiceRole).mockReturnValue(serviceClient as never)
  return { ...mock, updateUserById }
}

describe('PUT /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('getRouterParam', getRouterParamMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: selfId } as never)
    getRouterParamMock.mockReturnValue(otherId)
    readBodyMock.mockResolvedValue({})
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('非管理者は 403', async () => {
    mockCaller('trainee')
    readBodyMock.mockResolvedValue({ name: 'x' })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  // --- 自己ロックアウト防止 ---

  it('自分自身の管理者権限を降格しようとすると 400', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(selfId) // 自己更新
    readBodyMock.mockResolvedValue({ role: 'trainee' })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('自分自身を無効化しようとすると 400', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(selfId) // 自己更新
    readBodyMock.mockResolvedValue({ is_active: false })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('自分自身でも role を admin のまま / 名前変更は許可', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(selfId) // 自己更新
    readBodyMock.mockResolvedValue({ name: '管理者 太郎', role: 'admin' })
    const updated = { id: selfId, name: '管理者 太郎', role: 'admin' }
    const { query } = mockServiceUpdate({ data: updated, error: null })

    const result = await handler(eventStub)

    expect(query.update).toHaveBeenCalledWith({ name: '管理者 太郎', role: 'admin' })
    expect(result).toEqual(updated)
  })

  it('他の管理者を降格するのは許可（自己でなければガードは効かない）', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(otherId) // 別ユーザー
    readBodyMock.mockResolvedValue({ role: 'trainee' })
    const updated = { id: otherId, role: 'trainee' }
    mockServiceUpdate({ data: updated, error: null })

    const result = await handler(eventStub)
    expect(result).toEqual(updated)
  })

  // --- email を auth.users と同期 ---

  it('email 変更時は auth.users の email も同期し profiles も更新する', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(otherId)
    readBodyMock.mockResolvedValue({ email: 'new@joynal.test' })
    const updated = { id: otherId, email: 'new@joynal.test' }
    const { query, updateUserById } = mockServiceUpdate({ data: updated, error: null })

    const result = await handler(eventStub)

    expect(updateUserById).toHaveBeenCalledWith(otherId, { email: 'new@joynal.test', email_confirm: true })
    expect(query.update).toHaveBeenCalledWith({ email: 'new@joynal.test' })
    expect(result).toEqual(updated)
  })

  it('auth の email 重複(422)は 409 で profiles を更新しない', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(otherId)
    readBodyMock.mockResolvedValue({ email: 'dup@joynal.test' })
    const { query } = mockServiceUpdate({ data: null, error: null }, { error: { status: 422 } })

    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 409 })
    expect(query.update).not.toHaveBeenCalled()
  })

  // --- 社員ID（employee_id）---

  it('employee_id 変更時は update に含めて profiles を更新する', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(otherId)
    readBodyMock.mockResolvedValue({ employee_id: 'E042' })
    const updated = { id: otherId, employee_id: 'E042' }
    const { query } = mockServiceUpdate({ data: updated, error: null })

    const result = await handler(eventStub)

    expect(query.update).toHaveBeenCalledWith({ employee_id: 'E042' })
    expect(result).toEqual(updated)
  })

  it('employee_id 重複(23505)は 409 + code を返す', async () => {
    mockCaller('admin')
    getRouterParamMock.mockReturnValue(otherId)
    readBodyMock.mockResolvedValue({ employee_id: 'E001' })
    mockServiceUpdate({ data: null, error: { code: '23505' } })

    await expect(handler(eventStub)).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'EMPLOYEE_ID_TAKEN' }
    })
  })
})
