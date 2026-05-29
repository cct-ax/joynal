import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../../test/supabaseMock'
import '../../../test/serverGlobals'
import handler from './index.put'

const readBodyMock = vi.fn()
const getRouterParamMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]
const validId = '00000000-0000-4000-8000-000000000001'

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('PUT /api/reports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('getRouterParam', getRouterParamMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'user-1' } as never)
    getRouterParamMock.mockReturnValue(validId)
  })

  it('正常系: content のみ更新（時刻チェックの追加 fetch は走らない）', async () => {
    readBodyMock.mockResolvedValue({ content: '更新後' })
    const updated = { id: validId, content: '更新後' }
    const { query } = mockClient({ data: updated, error: null })

    const result = await handler(eventStub)

    expect(query.update).toHaveBeenCalledWith({ content: '更新後' })
    // 片側のみ時刻更新ではないので select による既存値 fetch は呼ばれない
    expect(query.select).toHaveBeenCalledTimes(1)
    expect(result).toEqual(updated)
  })

  it('両方の時刻を更新し逆転していれば 400（schema refine で弾く）', async () => {
    readBodyMock.mockResolvedValue({ check_in: '18:00', check_out: '09:00' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('退勤のみ更新で既存の出勤より前なら 400（既存値と突き合わせ）', async () => {
    readBodyMock.mockResolvedValue({ check_out: '08:00' })
    // 既存行 fetch の結果（出勤 09:00）。update には到達しない。
    mockClient({ data: { check_in: '09:00:00', check_out: '18:00:00' }, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('退勤のみ更新で既存の出勤より後なら成功', async () => {
    readBodyMock.mockResolvedValue({ check_out: '19:00' })
    const row = { id: validId, check_in: '09:00:00', check_out: '19:00:00' }
    mockClient({ data: row, error: null })

    const result = await handler(eventStub)
    expect(result).toEqual(row)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    readBodyMock.mockResolvedValue({ content: 'x' })
    mockClient({ data: null, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('存在しない(PGRST116)は 404', async () => {
    readBodyMock.mockResolvedValue({ content: 'x' })
    mockClient({ data: null, error: { code: 'PGRST116' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('RLS 拒否(42501)は 403', async () => {
    readBodyMock.mockResolvedValue({ content: 'x' })
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })
})
