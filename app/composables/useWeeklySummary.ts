import type {
  AiAudience,
  WeeklySummaryData,
  WeeklySummaryDoneData,
  WeeklySummaryErrorData,
  WeeklySummaryGetResponse
} from '#shared/types/api'
import { readSseStream } from '~/utils/sse'

/** unknown から文字列フィールドを安全に取り出す（as を使わない）。 */
const readString = (obj: unknown, key: string): string | null => {
  if (typeof obj !== 'object' || obj === null || !(key in obj)) return null
  const value = Reflect.get(obj, key)
  return typeof value === 'string' ? value : null
}

/** SSE delta フレームの data(JSON) から text を取り出す。 */
const parseDeltaText = (data: string): string | null => {
  try {
    return readString(JSON.parse(data), 'text')
  } catch {
    return null
  }
}

/** SSE done フレームの data(JSON) から完了メタを取り出す。 */
const parseDoneMeta = (data: string): WeeklySummaryDoneData | null => {
  let json: unknown
  try {
    json = JSON.parse(data)
  } catch {
    return null
  }
  const audience = readString(json, 'audience')
  const sourceUpdatedAt = readString(json, 'sourceUpdatedAt')
  if ((audience === 'self' || audience === 'mentor') && sourceUpdatedAt !== null) {
    const validAudience: AiAudience = audience
    return { audience: validAudience, sourceUpdatedAt }
  }
  return null
}

/** SSE error フレームの data(JSON) から message/code を取り出す。 */
const parseStreamError = (data: string): WeeklySummaryErrorData => {
  let json: unknown
  try {
    json = JSON.parse(data)
  } catch {
    json = null
  }
  return {
    message: readString(json, 'message') ?? 'サマリーの生成に失敗しました',
    code: readString(json, 'code') ?? 'AI_UPSTREAM_ERROR'
  }
}

/**
 * 週次 AI サマリーの取得・生成 composable。
 *
 * - GET（keyed useAsyncData('weekly-summary')・server:false）でキャッシュ済みサマリーと
 *   鮮度判定用の日報 max(updated_at) を取得する。`enabled` が false / userId 未定なら取得しない。
 * - `stale`＝保存時の日報より新しい日報があるか（再生成を促すため）。
 * - `generate()`＝POST で生成/再生成（SSE ストリーミング・useApiError でラップ）。
 *   生成中は `streamingContent` に差分が逐次積まれ、完了で `data` に反映する。
 * - useMoodTrend と同方針（SSR 前に対象が未確定なのでクライアント取得・useRequestFetch で Cookie 転送）。
 */
export const useWeeklySummary = (
  weekStart: Ref<string>,
  userId: Ref<string | undefined>,
  enabled: Ref<boolean>
): {
  summary: ComputedRef<WeeklySummaryData | null>
  stale: ComputedRef<boolean>
  generating: Ref<boolean>
  streamingContent: Ref<string>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
  generate: () => Promise<void>
  refresh: () => Promise<void>
} => {
  const requestFetch = useRequestFetch()
  const apiError = useApiError()
  const generating = ref(false)
  const streamingContent = ref('')

  const { data, refresh, status } = useAsyncData<WeeklySummaryGetResponse>(
    'weekly-summary',
    async () => {
      if (!enabled.value || !userId.value) {
        return { summary: null, latestReportUpdatedAt: null }
      }
      return await requestFetch<WeeklySummaryGetResponse>('/api/ai/weekly-summary', {
        query: { userId: userId.value, weekStart: weekStart.value }
      })
    },
    {
      watch: [weekStart, userId, enabled],
      default: () => ({ summary: null, latestReportUpdatedAt: null }),
      server: false
    }
  )

  const summary = computed<WeeklySummaryData | null>(() => data.value?.summary ?? null)

  const stale = computed<boolean>(() => {
    const s = data.value?.summary
    const latest = data.value?.latestReportUpdatedAt
    if (!s || !latest) return false
    return new Date(s.sourceUpdatedAt).getTime() < new Date(latest).getTime()
  })

  const generate = async (): Promise<void> => {
    if (!userId.value) return
    generating.value = true
    streamingContent.value = ''
    try {
      const stream = await $fetch<ReadableStream<Uint8Array>>('/api/ai/weekly-summary', {
        method: 'POST',
        body: { userId: userId.value, weekStart: weekStart.value },
        responseType: 'stream'
      })

      let meta: WeeklySummaryDoneData | null = null
      let streamError: WeeklySummaryErrorData | null = null
      for await (const frame of readSseStream(stream)) {
        if (frame.event === 'delta') {
          const text = parseDeltaText(frame.data)
          if (text) streamingContent.value += text
        } else if (frame.event === 'done') {
          meta = parseDoneMeta(frame.data)
        } else if (frame.event === 'error') {
          streamError = parseStreamError(frame.data)
        }
      }

      if (streamError) {
        apiError.notify(
          { statusCode: 502, data: streamError },
          { fallback: streamError.message }
        )
        return
      }
      if (meta && streamingContent.value.trim()) {
        const result: WeeklySummaryData = {
          content: streamingContent.value,
          audience: meta.audience,
          sourceUpdatedAt: meta.sourceUpdatedAt
        }
        // 生成直後は最新の日報で要約済み＝鮮度OK にするため latest を生成基準に合わせる。
        data.value = { summary: result, latestReportUpdatedAt: meta.sourceUpdatedAt }
      }
    } catch (error: unknown) {
      apiError.notify(error, { fallback: 'サマリーの生成に失敗しました' })
    } finally {
      generating.value = false
      streamingContent.value = ''
    }
  }

  return { summary, stale, generating, streamingContent, status, generate, refresh }
}
