import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/serverGlobals'
import {
  callAiProvider,
  extractAnthropicDelta,
  extractAnthropicText,
  extractOpenAiDelta,
  extractOpenAiText,
  streamAiProvider,
  type ResolvedAiConfig
} from './aiChat'

const fetchMock = vi.fn()

/** フレーム文字列の配列を SSE バイトストリームに変換する。 */
const sseStream = (frames: string[]): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    }
  })

/** AsyncGenerator を配列に集約する。 */
const collect = async (gen: AsyncGenerator<string>): Promise<string[]> => {
  const out: string[] = []
  for await (const chunk of gen) out.push(chunk)
  return out
}

const anthropicConfig: ResolvedAiConfig = {
  provider: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  apiKey: 'sk-ant-test',
  maxTokens: 1024
}
const openaiConfig: ResolvedAiConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'sk-oai-test',
  maxTokens: 512
}
const geminiConfig: ResolvedAiConfig = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: 'gm-test',
  maxTokens: 1024
}

describe('extractAnthropicText', () => {
  it('content の text ブロックを連結して返す', () => {
    expect(extractAnthropicText({ content: [{ type: 'text', text: 'こんにちは' }, { type: 'text', text: '世界' }] }))
      .toBe('こんにちは世界')
  })

  it('text ブロックが無い / 形状が違えば null', () => {
    expect(extractAnthropicText({ content: [{ type: 'tool_use' }] })).toBeNull()
    expect(extractAnthropicText({ content: [] })).toBeNull()
    expect(extractAnthropicText({})).toBeNull()
    expect(extractAnthropicText(null)).toBeNull()
  })
})

describe('extractOpenAiText', () => {
  it('choices[0].message.content を返す', () => {
    expect(extractOpenAiText({ choices: [{ message: { content: 'hi' } }] })).toBe('hi')
  })

  it('shape が違えば null', () => {
    expect(extractOpenAiText({ choices: [] })).toBeNull()
    expect(extractOpenAiText({ choices: [{ message: {} }] })).toBeNull()
    expect(extractOpenAiText({})).toBeNull()
  })
})

describe('callAiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', fetchMock)
  })

  it('anthropic: Messages API を正しい URL/ヘッダ/ボディで叩き本文を返す', async () => {
    fetchMock.mockResolvedValue({ content: [{ type: 'text', text: '深掘り質問です' }] })

    const text = await callAiProvider(anthropicConfig, { system: 'SYS', user: 'USR' })

    expect(text).toBe('深掘り質問です')
    expect(fetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-api-key': 'sk-ant-test', 'anthropic-version': '2023-06-01' }),
      body: expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'SYS',
        messages: [{ role: 'user', content: 'USR' }]
      })
    }))
  })

  it('openai: Chat Completions を Bearer 認証で叩き本文を返す（maxTokens 上書き）', async () => {
    fetchMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })

    const text = await callAiProvider(openaiConfig, { system: 'SYS', user: 'USR', maxTokens: 200 })

    expect(text).toBe('ok')
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-oai-test' }),
      body: expect.objectContaining({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'SYS' },
          { role: 'user', content: 'USR' }
        ]
      })
    }))
  })

  it('gemini: OpenAI 互換エンドポイントを Bearer 認証で叩き本文を返す', async () => {
    fetchMock.mockResolvedValue({ choices: [{ message: { content: 'ジェミニ応答' } }] })

    const text = await callAiProvider(geminiConfig, { system: 'SYS', user: 'USR' })

    expect(text).toBe('ジェミニ応答')
    expect(fetchMock).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer gm-test' }),
      body: expect.objectContaining({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'SYS' },
          { role: 'user', content: 'USR' }
        ]
      })
    }))
  })

  it('apiKey 未設定は 500（上流を叩かない）', async () => {
    await expect(callAiProvider({ ...anthropicConfig, apiKey: '' }, { system: 'S', user: 'U' }))
      .rejects.toMatchObject({ statusCode: 500 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('上流 API 例外は 502 (AI_UPSTREAM_ERROR)', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    await expect(callAiProvider(anthropicConfig, { system: 'S', user: 'U' }))
      .rejects.toMatchObject({ statusCode: 502, data: { code: 'AI_UPSTREAM_ERROR' } })
  })

  it('レスポンス形状が不正なら 502', async () => {
    fetchMock.mockResolvedValue({ unexpected: true })
    await expect(callAiProvider(anthropicConfig, { system: 'S', user: 'U' }))
      .rejects.toMatchObject({ statusCode: 502, data: { code: 'AI_UPSTREAM_ERROR' } })
  })
})

describe('extractAnthropicDelta', () => {
  it('content_block_delta / text_delta の text を返す', () => {
    expect(extractAnthropicDelta('{"type":"content_block_delta","delta":{"type":"text_delta","text":"あ"}}')).toBe('あ')
  })

  it('対象外イベント・不正 JSON は null', () => {
    expect(extractAnthropicDelta('{"type":"message_start"}')).toBeNull()
    expect(extractAnthropicDelta('{"type":"content_block_delta","delta":{"type":"input_json_delta"}}')).toBeNull()
    expect(extractAnthropicDelta('not json')).toBeNull()
  })
})

describe('extractOpenAiDelta', () => {
  it('choices[0].delta.content を返す', () => {
    expect(extractOpenAiDelta('{"choices":[{"delta":{"content":"hi"}}]}')).toBe('hi')
  })

  it('[DONE]・content 無し・不正 JSON は null', () => {
    expect(extractOpenAiDelta('[DONE]')).toBeNull()
    expect(extractOpenAiDelta('{"choices":[{"delta":{}}]}')).toBeNull()
    expect(extractOpenAiDelta('nope')).toBeNull()
  })
})

describe('streamAiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', fetchMock)
  })

  it('anthropic: text_delta を順次 yield し stream:true で叩く', async () => {
    fetchMock.mockResolvedValue(sseStream([
      'event: message_start\ndata: {"type":"message_start"}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"こんにちは"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"世界"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n'
    ]))

    const chunks = await collect(streamAiProvider(anthropicConfig, { system: 'SYS', user: 'USR' }))

    expect(chunks).toEqual(['こんにちは', '世界'])
    expect(fetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      method: 'POST',
      responseType: 'stream',
      headers: expect.objectContaining({ 'x-api-key': 'sk-ant-test' }),
      body: expect.objectContaining({ model: 'claude-haiku-4-5-20251001', stream: true })
    }))
  })

  it('gemini(OpenAI互換): delta.content を yield し [DONE] で終端', async () => {
    fetchMock.mockResolvedValue(sseStream([
      'data: {"choices":[{"delta":{"content":"ジェ"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"ミニ"}}]}\n\n',
      'data: [DONE]\n\n'
    ]))

    const chunks = await collect(streamAiProvider(geminiConfig, { system: 'SYS', user: 'USR' }))

    expect(chunks).toEqual(['ジェ', 'ミニ'])
    expect(fetchMock).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', expect.objectContaining({
      responseType: 'stream',
      body: expect.objectContaining({ stream: true })
    }))
  })

  it('チャンク境界をまたいでも欠落せず連結する', async () => {
    fetchMock.mockResolvedValue(sseStream([
      'data: {"choices":[{"delta":{"content":"ab',
      'c"}}]}\n\ndata: {"choices":[{"delta":{"content":"d"}}]}\n\n',
      'data: [DONE]\n\n'
    ]))

    const chunks = await collect(streamAiProvider(openaiConfig, { system: 'S', user: 'U' }))

    expect(chunks).toEqual(['abc', 'd'])
  })

  it('apiKey 未設定は 500（上流を叩かない）', async () => {
    await expect(collect(streamAiProvider({ ...anthropicConfig, apiKey: '' }, { system: 'S', user: 'U' })))
      .rejects.toMatchObject({ statusCode: 500 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('上流 API 例外は 502 (AI_UPSTREAM_ERROR)', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    await expect(collect(streamAiProvider(anthropicConfig, { system: 'S', user: 'U' })))
      .rejects.toMatchObject({ statusCode: 502, data: { code: 'AI_UPSTREAM_ERROR' } })
  })
})
