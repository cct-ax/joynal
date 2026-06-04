import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './me.get'

const eventStub = {} as Parameters<typeof handler>[0]

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('GET /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'user-1' } as never)
  })

  it('自分のプロフィールを sub で引いて返す', async () => {
    const profile = { id: 'user-1', name: '新人テスト', role: 'trainee' }
    const { query } = mockClient({ data: profile, error: null })

    const result = await handler(eventStub)

    expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(result).toEqual(profile)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('profiles 行が無ければ 404（招待フロー未経由）', async () => {
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('DB エラーは 500', async () => {
    mockClient({ data: null, error: { code: 'XX000' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
