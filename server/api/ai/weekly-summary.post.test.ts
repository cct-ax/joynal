import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock, type QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './weekly-summary.post'

const readBodyMock = vi.fn()
const aiChatStreamMock = vi.fn()
const rateLimitMock = vi.fn()
const pushMock = vi.fn()
const closeMock = vi.fn()
const sendMock = vi.fn(() => 'SSE_RESPONSE')
const createEventStreamMock = vi.fn(() => ({ push: pushMock, close: closeMock, send: sendMock }))
const eventStub = {} as Parameters<typeof handler>[0]
const requesterId = '00000000-0000-4000-8000-0000000000aa'
const otherUserId = '00000000-0000-4000-8000-0000000000bb'

const oneReport = [{ date: '2026-05-18', content: 'やった', mood: 4, updated_at: '2026-05-19T00:00:00Z' }]

/** 与えた文字列片を順次 yield する差分ストリーム。 */
async function* genFrom(parts: string[]): AsyncGenerator<string> {
  for (const p of parts) yield p
}

/** 反復開始時に throw する差分ストリーム（上流失敗の模擬）。 */
async function* genThrow(): AsyncGenerator<string> {
  throw Object.assign(new Error('upstream'), { statusCode: 502 })
  yield '' // 到達しない（AsyncGenerator にするため）
}

const mockStream = (parts: string[] | AsyncGenerator<string>) => {
  aiChatStreamMock.mockReturnValue({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    stream: Array.isArray(parts) ? genFrom(parts) : parts
  })
}

const mockClient = (result: QueryResult) => {
  const mock = createSupabaseClientMock(result)
  vi.mocked(serverSupabaseClient).mockResolvedValue(mock.client as never)
  return mock
}

describe('POST /api/ai/weekly-summary (SSE)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('aiChatStream', aiChatStreamMock)
    vi.stubGlobal('assertWithinDailyLimit', rateLimitMock)
    vi.stubGlobal('createEventStream', createEventStreamMock)
    sendMock.mockReturnValue('SSE_RESPONSE')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: requesterId } as never)
    readBodyMock.mockResolvedValue({ userId: requesterId, weekStart: '2026-05-18' })
    mockStream(['週次', 'サマリー本文'])
  })

  // --- 事前チェック（SSE 開始前に正しい HTTP ステータスで返る）---

  it('未認証は 401（ストリームを開始しない）', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
    expect(createEventStreamMock).not.toHaveBeenCalled()
    expect(aiChatStreamMock).not.toHaveBeenCalled()
  })

  it('weekStart が不正だと 400', async () => {
    readBodyMock.mockResolvedValue({ userId: requesterId, weekStart: 'bad' })
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
    expect(createEventStreamMock).not.toHaveBeenCalled()
  })

  it('その週に日報が無ければ 422（ストリームを開始しない）', async () => {
    mockClient({ data: [], error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 422 })
    expect(aiChatStreamMock).not.toHaveBeenCalled()
  })

  it('RLS 拒否(42501)は 403', async () => {
    mockClient({ data: null, error: { code: '42501' } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('日次上限を超えると 429（ストリームを開始しない）', async () => {
    rateLimitMock.mockRejectedValueOnce(Object.assign(new Error('limit'), { statusCode: 429 }))
    mockClient({ data: oneReport, error: null })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 429 })
    expect(createEventStreamMock).not.toHaveBeenCalled()
  })

  // --- SSE ストリーミング本体 ---

  it('正常系: delta を逐次 push し done で完了、upsert に model/provider を渡す（self 導出）', async () => {
    const { from, query } = mockClient({ data: oneReport, error: null })

    const result = await handler(eventStub)
    expect(result).toBe('SSE_RESPONSE')

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith({ event: 'done', data: expect.stringContaining('"audience":"self"') })
    )

    expect(pushMock).toHaveBeenCalledWith({ event: 'delta', data: '{"text":"週次"}' })
    expect(pushMock).toHaveBeenCalledWith({ event: 'delta', data: '{"text":"サマリー本文"}' })
    expect(pushMock).toHaveBeenCalledWith({ event: 'done', data: expect.stringContaining('"sourceUpdatedAt":"2026-05-19T00:00:00Z"') })
    expect(from).toHaveBeenCalledWith('ai_summaries')
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ content: '週次サマリー本文', model: 'gemini-2.5-flash', provider: 'gemini' }),
      expect.anything()
    )
    expect(closeMock).toHaveBeenCalled()
  })

  it('対象が他人なら audience=mentor で done を送る', async () => {
    readBodyMock.mockResolvedValue({ userId: otherUserId, weekStart: '2026-05-18' })
    mockClient({ data: oneReport, error: null })

    await handler(eventStub)

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith({ event: 'done', data: expect.stringContaining('"audience":"mentor"') })
    )
  })

  it('AI 応答が空なら error イベントを送り upsert しない', async () => {
    mockStream(['   '])
    const { query } = mockClient({ data: oneReport, error: null })

    await handler(eventStub)

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith({ event: 'error', data: expect.stringContaining('AI_UPSTREAM_ERROR') })
    )
    expect(query.upsert).not.toHaveBeenCalled()
  })

  it('生成中に上流が throw したら error イベントを送る', async () => {
    mockStream(genThrow())
    mockClient({ data: oneReport, error: null })

    await handler(eventStub)

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith({ event: 'error', data: expect.stringContaining('AI_UPSTREAM_ERROR') })
    )
    expect(closeMock).toHaveBeenCalled()
  })
})
