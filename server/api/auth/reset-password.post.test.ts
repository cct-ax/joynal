import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createSupabaseAuthMock, createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './reset-password.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

/** profiles 存在確認（service role の maybeSingle）の結果をモックする */
const mockExistence = (result: QueryResult) => {
  vi.mocked(serverSupabaseServiceRole).mockReturnValue(createSupabaseClientMock(result).client as never)
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    readBodyMock.mockResolvedValue({ email: 'trainee@joynal.test' })
  })

  it('登録済みメールはコードを送信する（204）', async () => {
    mockExistence({ data: { id: 'u1' }, error: null })
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await handler(eventStub)

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('trainee@joynal.test')
  })

  it('未登録メールは 404 で送信しない', async () => {
    mockExistence({ data: null, error: null })
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('送信失敗は 500', async () => {
    mockExistence({ data: { id: 'u1' }, error: null })
    const { client } = createSupabaseAuthMock({ error: { message: 'boom' } })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('不正な body（メール形式不正）は 400', async () => {
    readBodyMock.mockResolvedValue({ email: 'not-an-email' })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
