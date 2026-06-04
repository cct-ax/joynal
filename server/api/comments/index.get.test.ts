import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.get'

const getQueryMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const weekStart = '2026-05-25'
const traineeId = '00000000-0000-4000-8000-000000000001'
const validQuery = { weekStart, traineeId }

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('GET /api/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getQuery', getQueryMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'user-1' } as never)
    getQueryMock.mockReturnValue(validQuery)
  })

  it('正常系: week_start / trainee_id で絞り込み created_at 昇順で配列を返す', async () => {
    const comments = [
      { id: 'c1', week_start: weekStart, trainee_id: traineeId, commenter_id: 'user-1', content: 'よくできました', commenter: { name: 'メンター', role: 'mentor' } }
    ]
    const { from, query } = mockClient({ data: comments, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('comments')
    expect(query.eq).toHaveBeenCalledWith('week_start', weekStart)
    expect(query.eq).toHaveBeenCalledWith('trainee_id', traineeId)
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toEqual(comments)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('不正な query は 400', async () => {
    getQueryMock.mockReturnValue({ weekStart: 'invalid', traineeId: 'not-a-uuid' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('クライアントエラーは 500', async () => {
    mockClient({ data: null, error: { message: 'boom' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
