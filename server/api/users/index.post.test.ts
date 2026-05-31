import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const selfId = '00000000-0000-4000-8000-000000000001'

/** caller のロールを返す user client をモックする */
const mockCaller = (role: string) => {
  vi.mocked(serverSupabaseClient).mockResolvedValue(
    createSupabaseClientMock({ data: { role }, error: null }).client as never
  )
}

/**
 * service role 経由の招待（auth.admin.createUser → profiles.insert）をモックする。
 * insertResult で profiles.insert の戻り、authResult で createUser の戻りを差し替えられる。
 * createUser / deleteUser の spy を返す。
 */
const mockServiceCreate = (
  insertResult: QueryResult,
  authResult: { data?: unknown, error: unknown } = { data: { user: { id: 'new-id' } }, error: null }
) => {
  const mock = createSupabaseClientMock(insertResult)
  const createUser = vi.fn(() => Promise.resolve(authResult))
  const deleteUser = vi.fn(() => Promise.resolve({ error: null }))
  const serviceClient = { ...mock.client, auth: { admin: { createUser, deleteUser } } }
  vi.mocked(serverSupabaseServiceRole).mockReturnValue(serviceClient as never)
  return { ...mock, createUser, deleteUser }
}

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('setResponseStatus', vi.fn())
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: selfId } as never)
    readBodyMock.mockResolvedValue({
      name: '新人 花子',
      employee_id: 'E010',
      email: 'hanako@joynal.test',
      role: 'trainee'
    })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('非管理者は 403', async () => {
    mockCaller('trainee')
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('招待成功: employee_id を含めて profiles に insert し作成行を返す', async () => {
    mockCaller('admin')
    const created = {
      id: 'new-id',
      employee_id: 'E010',
      name: '新人 花子',
      email: 'hanako@joynal.test',
      role: 'trainee',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    }
    const { query, createUser } = mockServiceCreate({ data: created, error: null })

    const result = await handler(eventStub)

    expect(createUser).toHaveBeenCalledWith({ email: 'hanako@joynal.test', email_confirm: true })
    expect(query.insert).toHaveBeenCalledWith({
      id: 'new-id',
      name: '新人 花子',
      email: 'hanako@joynal.test',
      role: 'trainee',
      employee_id: 'E010'
    })
    expect(result).toEqual(created)
  })

  it('社員ID重複(23505)は 409 + code を返し auth ユーザーをロールバックする', async () => {
    mockCaller('admin')
    const { deleteUser } = mockServiceCreate({ data: null, error: { code: '23505' } })

    await expect(handler(eventStub)).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'EMPLOYEE_ID_TAKEN' }
    })
    expect(deleteUser).toHaveBeenCalledWith('new-id')
  })

  it('メール重複(422)は 409 を返す', async () => {
    mockCaller('admin')
    mockServiceCreate({ data: null, error: null }, { data: { user: null }, error: { status: 422 } })

    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 409 })
  })
})
