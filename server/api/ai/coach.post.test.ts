import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseUser } from '#supabase/server'
import '../../test/serverGlobals'
import handler from './coach.post'

const aiChatMock = vi.fn()
const readBodyMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]
const userId = '00000000-0000-4000-8000-0000000000aa'

describe('POST /api/ai/coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readBody', readBodyMock)
    vi.stubGlobal('aiChat', aiChatMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    readBodyMock.mockResolvedValue({ content: 'APIを実装した', mood: 4 })
  })

  it('未認証は 401（AI を呼ばない）', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
    expect(aiChatMock).not.toHaveBeenCalled()
  })

  it('content が 5000 文字超だと 400', async () => {
    readBodyMock.mockResolvedValue({ content: 'あ'.repeat(5001) })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 400 })
    expect(aiChatMock).not.toHaveBeenCalled()
  })

  it('正常系: aiChat を呼び {questions, feedback} を返す', async () => {
    aiChatMock.mockResolvedValue('{"questions":["なぜそう感じた？","次はどうする？"],"feedback":"よい一歩です"}')

    const result = await handler(eventStub)

    expect(aiChatMock).toHaveBeenCalledOnce()
    expect(result).toEqual({ questions: ['なぜそう感じた？', '次はどうする？'], feedback: 'よい一歩です' })
  })

  it('ドラフトが空でも呼べる（スターター質問）', async () => {
    readBodyMock.mockResolvedValue({})
    aiChatMock.mockResolvedValue('{"questions":["今日の目標は？"],"feedback":""}')

    const result = await handler(eventStub)

    expect(result.questions.length).toBeGreaterThan(0)
    expect(result.feedback).toBe('')
  })

  it('AI 応答が解釈不能なら 502', async () => {
    aiChatMock.mockResolvedValue('意味不明なテキスト')
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('aiChat が throw したらそのまま伝播する', async () => {
    aiChatMock.mockRejectedValue(Object.assign(new Error('upstream'), {
      statusCode: 502,
      data: { code: 'AI_UPSTREAM_ERROR' }
    }))
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 502 })
  })
})
