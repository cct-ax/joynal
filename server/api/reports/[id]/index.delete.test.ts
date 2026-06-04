import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../../test/supabaseMock'
import '../../../test/serverGlobals'
import handler from './index.delete'

const getRouterParamMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const userId = '00000000-0000-4000-8000-0000000000aa'
const reportId = '00000000-0000-4000-8000-0000000000cc'

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('DELETE /api/reports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getRouterParam', getRouterParamMock)
    // setResponseStatus は auto-import の本物が呼ばれる（stub は効かない）が、空 event でも無害。
    vi.stubGlobal('setResponseStatus', vi.fn())
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    getRouterParamMock.mockReturnValue(reportId)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: null, error: null, count: 1 })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('id が UUID 形状でないと 400', async () => {
    getRouterParamMock.mockReturnValue('not-a-uuid')
    mockClient({ data: null, error: null, count: 1 })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('正常系: count>0 で削除し 204 を返す', async () => {
    const { from, query } = mockClient({ data: null, error: null, count: 1 })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('daily_reports')
    expect(query.delete).toHaveBeenCalledWith({ count: 'exact' })
    expect(query.eq).toHaveBeenCalledWith('id', reportId)
    // 例外を投げず null を返す（成功 = 204 ボディなし）
    expect(result).toBeNull()
  })

  it('対象不存在(count=0)は 404', async () => {
    mockClient({ data: null, error: null, count: 0 })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('PGRST116（対象なし）は 404', async () => {
    mockClient({ data: null, error: { code: 'PGRST116' }, count: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('権限外(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' }, count: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('未マップのエラーは 500', async () => {
    mockClient({ data: null, error: { code: 'XXYY', message: 'boom' }, count: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })
})
