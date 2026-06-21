import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './weekly-summary.post'

const readBodyMock = vi.fn()
const aiChatMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]
const requesterId = '00000000-0000-4000-8000-0000000000aa'
const otherUserId = '00000000-0000-4000-8000-0000000000bb'

const oneReport = [{ date: '2026-05-18', content: 'やった', mood: 4, updated_at: '2026-05-19T00:00:00Z' }]

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('POST /api/ai/weekly-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('aiChat', aiChatMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: requesterId } as never)
    readBodyMock.mockResolvedValue({ userId: requesterId, weekStart: '2026-05-18' })
    aiChatMock.mockResolvedValue({ text: '週次サマリー本文', model: 'gemini-2.5-flash', provider: 'gemini' })
  })

  it('未認証は 401（AI を呼ばない）', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
    expect(aiChatMock).not.toHaveBeenCalled()
  })

  it('weekStart が不正だと 400', async () => {
    readBodyMock.mockResolvedValue({ userId: requesterId, weekStart: 'bad' })
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('その週に日報が無ければ 422（AI を呼ばない）', async () => {
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 422 })
    expect(aiChatMock).not.toHaveBeenCalled()
  })

  it('正常系: aiChat を呼び upsert して内容を返す（self 導出）', async () => {
    const { from, query } = mockClient({ data: oneReport, error: null })

    const result = await handler(eventStub)

    expect(aiChatMock).toHaveBeenCalledOnce()
    expect(from).toHaveBeenCalledWith('ai_summaries')
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash', provider: 'gemini' }),
      expect.anything()
    )
    expect(result).toEqual({
      content: '週次サマリー本文',
      audience: 'self',
      sourceUpdatedAt: '2026-05-19T00:00:00Z'
    })
  })

  it('対象が他人なら audience=mentor で生成する', async () => {
    readBodyMock.mockResolvedValue({ userId: otherUserId, weekStart: '2026-05-18' })
    mockClient({ data: oneReport, error: null })

    const result = await handler(eventStub)

    expect(result.audience).toBe('mentor')
  })

  it('AI 応答が空なら 502', async () => {
    aiChatMock.mockResolvedValue({ text: '   ', model: 'gemini-2.5-flash', provider: 'gemini' })
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('aiChat が throw したら伝播する', async () => {
    aiChatMock.mockRejectedValue(Object.assign(new Error('upstream'), { statusCode: 502 }))
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })
})
