import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient } from '#supabase/server'
import { createSupabaseAuthMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './logout.post'

const eventStub = {} as Parameters<typeof handler>[0]

const mockAuth = (authResult: { error: unknown } = { error: null }) => {
  const mock = createSupabaseAuthMock(authResult)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // setResponseStatus は auto-import の本物が呼ばれる（stub は効かない）が、空 event でも無害。
    vi.stubGlobal('setResponseStatus', vi.fn())
  })

  it('正常系: signOut を呼び 204（null）を返す', async () => {
    const { auth } = mockAuth()

    const result = await handler(eventStub)

    expect(auth.signOut).toHaveBeenCalled()
    // 成功時はボディなし（204）= null を返す
    expect(result).toBeNull()
  })

  it('signOut がエラーを返しても例外を投げず null を返す（実装は戻りエラーを無視）', async () => {
    // 実装は signOut の戻りを確認していないため、エラーでも例外を投げず 204（null）を返す。
    const { auth } = mockAuth({ error: { message: 'sign out failed' } })

    const result = await handler(eventStub)

    expect(auth.signOut).toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
