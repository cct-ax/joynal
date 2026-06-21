import type { H3Event } from 'h3'

/**
 * プロバイダ非依存の AI チャットアダプタ。
 *
 * Anthropic（Messages API）と OpenAI 互換（OpenAI / Google Gemini の Chat Completions）に
 * 対応する。SDK を使わず素の `$fetch`（ofetch）で実装する（Cloudflare Workers 互換のため）。
 * Gemini は OpenAI 互換エンドポイントを使うため OpenAI と同じ処理パスで扱う。
 *
 * テスト容易性のため「設定解決（runtimeConfig 依存）」と「HTTP 呼び出し（純粋）」を分離する:
 * - `callAiProvider(config, req)` … config を引数で受けるため $fetch モックのみで完全にテスト可能
 * - `resolveAiConfig(event)` … useRuntimeConfig 依存（ハンドラテストでは aiChat ごと vi.stubGlobal）
 * - `aiChat(event, params)` … 上記の薄い合成。ハンドラはこれを auto-import で呼ぶ
 */

/** AI プロバイダの種類。runtimeConfig 既定 ＋ 非本番のリクエスト上書きで選択する。 */
export type AiProvider = 'anthropic' | 'openai' | 'gemini'

/** 解決済み AI 設定（resolveAiConfig が runtimeConfig から組み立てる）。 */
export type ResolvedAiConfig = {
  provider: AiProvider
  model: string
  apiKey: string
  maxTokens: number
}

/** aiChat / callAiProvider への 1 リクエスト分の入力。 */
export type AiChatRequest = {
  system: string
  user: string
  maxTokens?: number
}

/** aiChat の引数。非本番限定で provider/model を上書きできる（PL の品質比較用）。 */
export type AiChatParams = AiChatRequest & {
  provider?: AiProvider
  model?: string
}

/** 上流 AI 失敗時の共通エラー（フロントの useApiError が data.message を拾える形）。 */
const AI_UPSTREAM_ERROR = {
  statusCode: 502,
  statusMessage: 'Bad Gateway',
  data: { message: 'AI 応答の取得に失敗しました。時間をおいて再度お試しください', code: 'AI_UPSTREAM_ERROR' }
}

/** OpenAI 互換 Chat Completions のエンドポイント（Gemini は OpenAI 互換層を使う）。 */
const OPENAI_COMPAT_URL: Record<'openai' | 'gemini', string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
}

/** unknown から安全にプロパティを 1 つ取り出す（型ガードを 1 箇所に集約）。 */
export const getProp = (obj: unknown, key: string): unknown =>
  typeof obj === 'object' && obj !== null && key in obj
    ? (obj as Record<string, unknown>)[key]
    : undefined

/** 上流エラーを機密・冗長データを避けて要約する（ログ用。生レスポンスや本文は出さない）。 */
const summarizeError = (error: unknown): string => {
  const status = getProp(error, 'status') ?? getProp(error, 'statusCode')
  const message = getProp(error, 'message')
  const statusStr = typeof status === 'number' ? String(status) : 'n/a'
  const messageStr = typeof message === 'string' ? message : 'unknown error'
  return `status=${statusStr} message=${messageStr}`
}

/** Anthropic Messages API レスポンスから本文テキストを安全に取り出す。取れなければ null。 */
export const extractAnthropicText = (res: unknown): string | null => {
  const content = getProp(res, 'content')
  if (!Array.isArray(content)) return null
  const parts: string[] = []
  for (const block of content) {
    if (getProp(block, 'type') !== 'text') continue
    const text = getProp(block, 'text')
    if (typeof text === 'string') parts.push(text)
  }
  const joined = parts.join('').trim()
  return joined.length > 0 ? joined : null
}

/** OpenAI Chat Completions レスポンスから本文テキストを安全に取り出す。取れなければ null。 */
export const extractOpenAiText = (res: unknown): string | null => {
  const choices = getProp(res, 'choices')
  if (!Array.isArray(choices)) return null
  const content = getProp(getProp(choices[0], 'message'), 'content')
  if (typeof content !== 'string') return null
  const trimmed = content.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * 解決済み config で AI プロバイダを 1 回呼び、本文テキストを返す。
 * - apiKey 未設定は 500
 * - 上流の通信失敗・レスポンス形状不正は 502（AI_UPSTREAM_ERROR）
 */
export const callAiProvider = async (config: ResolvedAiConfig, req: AiChatRequest): Promise<string> => {
  if (!config.apiKey) {
    throw createError({ statusCode: 500, message: 'AI API キーが設定されていません' })
  }
  const maxTokens = req.maxTokens ?? config.maxTokens

  let res: unknown
  try {
    if (config.provider === 'anthropic') {
      res = await $fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: {
          model: config.model,
          max_tokens: maxTokens,
          system: req.system,
          messages: [{ role: 'user', content: req.user }]
        }
      })
    } else {
      // OpenAI と Gemini は OpenAI 互換フォーマット（URL のみ異なる）
      res = await $fetch(OPENAI_COMPAT_URL[config.provider], {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: {
          model: config.model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user }
          ]
        }
      })
    }
  } catch (error) {
    console.error('[aiChat] upstream request failed:', summarizeError(error))
    throw createError(AI_UPSTREAM_ERROR)
  }

  const text = config.provider === 'anthropic' ? extractAnthropicText(res) : extractOpenAiText(res)
  if (text === null) {
    console.error(`[aiChat] unexpected response shape from ${config.provider}`)
    throw createError(AI_UPSTREAM_ERROR)
  }
  return text
}

const normalizeProvider = (v: unknown): AiProvider =>
  v === 'openai' ? 'openai' : v === 'gemini' ? 'gemini' : 'anthropic'

/**
 * runtimeConfig から AI 設定を解決する。
 * provider/model のリクエスト上書きは非本番（dev）でのみ有効（本番は config 既定に固定）。
 */
export const resolveAiConfig = (
  event: H3Event,
  overrides?: { provider?: AiProvider, model?: string }
): ResolvedAiConfig => {
  const config = useRuntimeConfig(event)
  const allowOverride = import.meta.dev === true

  const provider = allowOverride && overrides?.provider
    ? overrides.provider
    : normalizeProvider(config.aiProvider)

  const apiKey = provider === 'anthropic'
    ? config.anthropicApiKey
    : provider === 'gemini' ? config.geminiApiKey : config.openaiApiKey
  const defaultModel = provider === 'anthropic'
    ? config.anthropicModel
    : provider === 'gemini' ? config.geminiModel : config.openaiModel
  const model = allowOverride && overrides?.model ? overrides.model : defaultModel

  return { provider, model, apiKey, maxTokens: config.aiMaxTokens }
}

/** aiChat の戻り。本文に加えて、実際に使った model/provider をトレース用に返す。 */
export type AiChatResult = { text: string, model: string, provider: AiProvider }

/**
 * runtimeConfig を解決して AI プロバイダを 1 回呼ぶ薄い合成関数。
 * ハンドラ（coach / weekly-summary）はこれを auto-import で呼ぶ。
 */
export const aiChat = async (event: H3Event, params: AiChatParams): Promise<AiChatResult> => {
  const config = resolveAiConfig(event, { provider: params.provider, model: params.model })
  const text = await callAiProvider(config, { system: params.system, user: params.user, maxTokens: params.maxTokens })
  return { text, model: config.model, provider: config.provider }
}
