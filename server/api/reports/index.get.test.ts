import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.get'

const getQueryMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const userId = '00000000-0000-4000-8000-0000000000aa'

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('GET /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getQuery', getQueryMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    getQueryMock.mockReturnValue({ weekStart: '2026-05-18' })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('weekStart 未指定は 400', async () => {
    getQueryMock.mockReturnValue({})
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('weekStart が YYYY-MM-DD 形式でないと 400', async () => {
    getQueryMock.mockReturnValue({ weekStart: '2026/05/18' })
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('正常系: weekStart〜+6日で date を範囲指定し date 昇順で取得する', async () => {
    const rows = [
      { id: 'r1', user_id: userId, date: '2026-05-18', content: 'A' },
      { id: 'r2', user_id: userId, date: '2026-05-19', content: 'B' }
    ]
    const { from, query } = mockClient({ data: rows, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('daily_reports')
    expect(query.gte).toHaveBeenCalledWith('date', '2026-05-18')
    expect(query.lte).toHaveBeenCalledWith('date', '2026-05-24')
    expect(query.order).toHaveBeenCalledWith('date', { ascending: true })
    // userId 未指定なら user_id では絞り込まない
    expect(query.eq).not.toHaveBeenCalled()
    expect(result).toEqual(rows)
  })

  it('userId 指定時は user_id で絞り込む', async () => {
    const targetId = '00000000-0000-4000-8000-0000000000bb'
    getQueryMock.mockReturnValue({ weekStart: '2026-05-18', userId: targetId })
    const { query } = mockClient({ data: [], error: null })

    await handler(eventStub)

    expect(query.eq).toHaveBeenCalledWith('user_id', targetId)
  })

  it('空週は空配列を返す', async () => {
    mockClient({ data: [], error: null })
    const result = await handler(eventStub)
    expect(result).toEqual([])
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('未マップのクエリエラーは 500', async () => {
    mockClient({ data: null, error: { code: 'XXYY', message: 'boom' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
