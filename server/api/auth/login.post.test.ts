import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient } from '#supabase/server'
import { createSupabaseAuthMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './login.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    readBodyMock.mockResolvedValue({ email: 'trainee@joynal.test', password: 'password123' })
  })

  it('正常系: signInWithPassword をメール/パスワードで呼ぶ', async () => {
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await handler(eventStub)

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'trainee@joynal.test',
      password: 'password123'
    })
  })

  it('認証失敗は 401', async () => {
    const { client } = createSupabaseAuthMock({ error: { message: 'Invalid login credentials' } })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('不正な body（メール形式不正）は 400', async () => {
    readBodyMock.mockResolvedValue({ email: 'not-an-email', password: '' })
    vi.mocked(serverSupabaseClient).mockResolvedValue(createSupabaseAuthMock().client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
