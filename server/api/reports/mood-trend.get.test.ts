import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './mood-trend.get'

const getQueryMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const userId = '00000000-0000-4000-8000-0000000000aa'

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('GET /api/reports/mood-trend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getQuery', getQueryMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    getQueryMock.mockReturnValue({ from: '2026-03-30', to: '2026-05-22' })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('from 未指定は 400', async () => {
    getQueryMock.mockReturnValue({ to: '2026-05-22' })
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('from が YYYY-MM-DD 形式でないと 400', async () => {
    getQueryMock.mockReturnValue({ from: '2026/03/30', to: '2026-05-22' })
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('正常系: date/mood を範囲指定し date 昇順で取得、{ date, mood } に整形する', async () => {
    const rows = [
      { date: '2026-05-18', mood: 4 },
      { date: '2026-05-19', mood: 3 }
    ]
    const { from, query } = mockClient({ data: rows, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('daily_reports')
    expect(query.select).toHaveBeenCalledWith('date, mood')
    expect(query.gte).toHaveBeenCalledWith('date', '2026-03-30')
    expect(query.lte).toHaveBeenCalledWith('date', '2026-05-22')
    expect(query.order).toHaveBeenCalledWith('date', { ascending: true })
    // userId 未指定なら user_id では絞り込まない
    expect(query.eq).not.toHaveBeenCalled()
    expect(result).toEqual([
      { date: '2026-05-18', mood: 4 },
      { date: '2026-05-19', mood: 3 }
    ])
  })

  it('mood が NULL / 範囲外の行は除外する', async () => {
    const rows = [
      { date: '2026-05-18', mood: null },
      { date: '2026-05-19', mood: 3 },
      { date: '2026-05-20', mood: 0 },
      { date: '2026-05-21', mood: 6 }
    ]
    mockClient({ data: rows, error: null })

    const result = await handler(eventStub)

    expect(result).toEqual([{ date: '2026-05-19', mood: 3 }])
  })

  it('userId 指定時は user_id で絞り込む', async () => {
    const targetId = '00000000-0000-4000-8000-0000000000bb'
    getQueryMock.mockReturnValue({ from: '2026-03-30', to: '2026-05-22', userId: targetId })
    const { query } = mockClient({ data: [], error: null })

    await handler(eventStub)

    expect(query.eq).toHaveBeenCalledWith('user_id', targetId)
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
