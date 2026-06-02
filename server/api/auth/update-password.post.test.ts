import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseAuthMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './update-password.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const userId = '00000000-0000-4000-8000-0000000000aa'

const mockAuth = (authResult: { error: unknown } = { error: null }) => {
  const mock = createSupabaseAuthMock(authResult)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('POST /api/auth/update-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    // setResponseStatus は auto-import の本物が呼ばれる（stub は効かない）が、空 event でも無害。
    vi.stubGlobal('setResponseStatus', vi.fn())
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    readBodyMock.mockResolvedValue({ password: 'newpassword123' })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockAuth()
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('正常系: updateUser に新パスワードを渡し 204（null）を返す', async () => {
    const { auth } = mockAuth()

    const result = await handler(eventStub)

    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    // 成功時はボディなし（204）= null を返す
    expect(result).toBeNull()
  })

  it('8文字未満のパスワードは 400（バリデーションエラー）', async () => {
    readBodyMock.mockResolvedValue({ password: 'short' })
    mockAuth()
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('password 欠落は 400（バリデーションエラー）', async () => {
    readBodyMock.mockResolvedValue({})
    mockAuth()
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('Supabase の updateUser エラーは 400 に変換する', async () => {
    mockAuth({ error: { message: 'weak password' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
