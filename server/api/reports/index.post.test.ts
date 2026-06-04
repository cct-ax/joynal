import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.post'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const validBody = { date: '2026-05-25', check_in: '09:00', check_out: '18:00', content: '作業', mood: 4 }

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('POST /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'user-1' } as never)
    readBodyMock.mockResolvedValue(validBody)
  })

  it('正常系: 201 で作成し user_id を sub から設定する', async () => {
    const created = { id: 'r1', user_id: 'user-1', ...validBody }
    const { from, query } = mockClient({ data: created, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('daily_reports')
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', date: '2026-05-25' }))
    expect(result).toEqual(created)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('同日重複(23505)は 409', async () => {
    mockClient({ data: null, error: { code: '23505' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('不正な body は 400', async () => {
    readBodyMock.mockResolvedValue({ date: 'invalid' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })
})
