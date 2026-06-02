import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.put'

const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const callerId = '00000000-0000-4000-8000-000000000001'
const traineeId = '00000000-0000-4000-8000-0000000000a1'
const mentorId = '00000000-0000-4000-8000-0000000000b1'
const ojtId = '00000000-0000-4000-8000-0000000000c1'

const validBody = { traineeId, mentorId, ojtId, year: 2026 }

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('PUT /api/assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: callerId } as never)
    readBodyMock.mockResolvedValue(validBody)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('traineeId 未指定は 400', async () => {
    readBodyMock.mockResolvedValue({ mentorId, ojtId, year: 2026 })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('正常系: trainee_id + year を一意キーに upsert し保存行を返す', async () => {
    const saved = { trainee_id: traineeId, mentor_id: mentorId, ojt_id: ojtId, year: 2026 }
    const { from, query } = mockClient({ data: saved, error: null })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('mentor_assignments')
    expect(query.upsert).toHaveBeenCalledWith(
      { trainee_id: traineeId, mentor_id: mentorId, ojt_id: ojtId, year: 2026 },
      { onConflict: 'trainee_id,year' }
    )
    expect(result).toEqual(saved)
  })

  it('mentorId / ojtId は null（未割り当て）も受け付ける', async () => {
    readBodyMock.mockResolvedValue({ traineeId, mentorId: null, ojtId: null, year: 2026 })
    const saved = { trainee_id: traineeId, mentor_id: null, ojt_id: null, year: 2026 }
    const { query } = mockClient({ data: saved, error: null })

    const result = await handler(eventStub)

    expect(query.upsert).toHaveBeenCalledWith(
      { trainee_id: traineeId, mentor_id: null, ojt_id: null, year: 2026 },
      { onConflict: 'trainee_id,year' }
    )
    expect(result).toEqual(saved)
  })

  it('year 省略時は現在年度を自動セットする', async () => {
    readBodyMock.mockResolvedValue({ traineeId, mentorId, ojtId })
    const currentYear = new Date().getFullYear()
    const { query } = mockClient({ data: { trainee_id: traineeId, year: currentYear }, error: null })

    await handler(eventStub)

    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ year: currentYear }),
      { onConflict: 'trainee_id,year' }
    )
  })

  it('FK 違反(23503: 存在しないユーザー)は 404', async () => {
    mockClient({ data: null, error: { code: '23503' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('非管理者の RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('未マップのエラーは 500', async () => {
    mockClient({ data: null, error: { code: 'XXYY', message: 'boom' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
