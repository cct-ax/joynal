import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient } from '#supabase/server'
import { createSupabaseAuthMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './reset-password-otp.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const validBody = {
  email: 'trainee@joynal.test',
  token: '123456',
  password: 'new-secret-123'
}

describe('POST /api/auth/reset-password-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    readBodyMock.mockResolvedValue({ ...validBody })
  })

  it('コード検証→更新→全セッション失効を順に行う', async () => {
    const { client, auth } = createSupabaseAuthMock({ error: null })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await handler(eventStub)

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'trainee@joynal.test',
      token: '123456',
      type: 'recovery'
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret-123' })
    expect(auth.signOut).toHaveBeenCalled()
  })

  it('コードが不正/期限切れ（verifyOtp エラー）は 400 で更新しない', async () => {
    const { client, auth } = createSupabaseAuthMock({ error: null })
    auth.verifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('updateUser エラーは 400。recovery セッションを残さないよう signOut する', async () => {
    const { client, auth } = createSupabaseAuthMock({ error: null })
    auth.updateUser.mockResolvedValue({ error: { message: 'weak password' } })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
    expect(auth.signOut).toHaveBeenCalled()
  })

  it('updateUser が same_password のときは 422（SAME_PASSWORD）。recovery セッションは失効させる', async () => {
    // 新パスワードが現在と同一: Supabase は 422 same_password を返す。「コード不正」と混同しない。
    const { client, auth } = createSupabaseAuthMock({ error: null })
    auth.updateUser.mockResolvedValue({
      error: { code: 'same_password', status: 422, message: 'New password should be different from the old password.' }
    })
    vi.mocked(serverSupabaseClient).mockResolvedValue(client as never)

    await expect(handler(eventStub)).rejects.toMatchObject({
      statusCode: 422,
      data: { code: 'SAME_PASSWORD' }
    })
    expect(auth.signOut).toHaveBeenCalled()
  })

  it('不正な body（コードが6桁でない）は 400', async () => {
    readBodyMock.mockResolvedValue({ ...validBody, token: '12ab' })
    vi.mocked(serverSupabaseClient).mockResolvedValue(createSupabaseAuthMock().client as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
