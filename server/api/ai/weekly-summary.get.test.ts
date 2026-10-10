import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './weekly-summary.get'

const getQueryMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]
const requesterId = '00000000-0000-4000-8000-0000000000aa'
const otherUserId = '00000000-0000-4000-8000-0000000000bb'

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('GET /api/ai/weekly-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getQuery', getQueryMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: requesterId } as never)
    getQueryMock.mockReturnValue({ userId: requesterId, weekStart: '2026-05-18' })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('weekStart が YYYY-MM-DD でないと 400', async () => {
    getQueryMock.mockReturnValue({ userId: requesterId, weekStart: '2026/05/18' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('対象が自分なら audience=self で照会する', async () => {
    const { query } = mockClient({ data: null, error: null })
    await handler(eventStub)
    expect(query.eq).toHaveBeenCalledWith('audience', 'self')
  })

  it('対象が他人なら audience=mentor で照会する', async () => {
    getQueryMock.mockReturnValue({ userId: otherUserId, weekStart: '2026-05-18' })
    const { query } = mockClient({ data: null, error: null })
    await handler(eventStub)
    expect(query.eq).toHaveBeenCalledWith('audience', 'mentor')
  })

  it('キャッシュありなら summary と latestReportUpdatedAt を返す', async () => {
    mockClient({
      data: {
        content: 'サマリー本文',
        source_updated_at: '2026-05-18T00:00:00Z',
        updated_at: '2026-05-20T00:00:00Z'
      },
      error: null
    })

    const result = await handler(eventStub)

    expect(result.summary).toEqual({
      content: 'サマリー本文',
      audience: 'self',
      sourceUpdatedAt: '2026-05-18T00:00:00Z'
    })
    expect(result.latestReportUpdatedAt).toBe('2026-05-20T00:00:00Z')
  })

  it('キャッシュなしなら summary は null', async () => {
    mockClient({ data: null, error: null })
    const result = await handler(eventStub)
    expect(result.summary).toBeNull()
    expect(result.latestReportUpdatedAt).toBeNull()
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })
})
