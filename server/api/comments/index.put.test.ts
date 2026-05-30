import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.put'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const weekStart = '2026-05-25'
const traineeId = '00000000-0000-4000-8000-000000000001'
const validBody = { weekStart, traineeId, content: 'よくできました' }

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('PUT /api/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'user-1' } as never)
    readBodyMock.mockResolvedValue(validBody)
  })

  it('正常系: commenter_id を sub から設定して upsert し、upsert 行を返す', async () => {
    const upserted = { id: 'c1', week_start: weekStart, trainee_id: traineeId, commenter_id: 'user-1', content: 'よくできました' }
    const { from, query } = mockClient({ data: upserted, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('comments')
    expect(query.upsert).toHaveBeenCalledWith(
      { week_start: weekStart, trainee_id: traineeId, commenter_id: 'user-1', content: 'よくできました' },
      { onConflict: 'week_start,trainee_id,commenter_id' }
    )
    expect(result).toEqual(upserted)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('不正な body は 400', async () => {
    readBodyMock.mockResolvedValue({ weekStart: 'invalid', traineeId: 'x', content: '' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('その他のエラーは 500', async () => {
    mockClient({ data: null, error: { code: '23505' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
