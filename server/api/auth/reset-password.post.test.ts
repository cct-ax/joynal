import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient } from '#supabase/server'
import { createSupabaseAuthMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './reset-password.post'

const readBodyMock = vi.fn()
const resolveSiteBaseUrlMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    // resolveSiteBaseUrl は server-only auto-import（free identifier）なので global stub で制御する。
    vi.stubGlobal('resolveSiteBaseUrl', resolveSiteBaseUrlMock)
    readBodyMock.mockResolvedValue({ email: 'trainee@joynal.test' })
    resolveSiteBaseUrlMock.mockReturnValue('https://app.example.com')
  })

  it('resolveSiteBaseUrl が返す origin の /confirm を redirectTo にする', async () => {
    resolveSiteBaseUrlMock.mockReturnValue('https://app.example.com')
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await handler(eventStub)

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('trainee@joynal.test', {
      redirectTo: 'https://app.example.com/confirm'
    })
  })

  it('base が変われば redirectTo もその origin になる', async () => {
    resolveSiteBaseUrlMock.mockReturnValue('https://req.example.com')
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await handler(eventStub)

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('trainee@joynal.test', {
      redirectTo: 'https://req.example.com/confirm'
    })
  })

  it('送信失敗は 500', async () => {
    const { client } = createSupabaseAuthMock({ error: { message: 'boom' } })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('不正な body（メール形式不正）は 400', async () => {
    readBodyMock.mockResolvedValue({ email: 'not-an-email' })
    vi.mocked(serverSupabaseClient).mockResolvedValue(createSupabaseAuthMock().client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
