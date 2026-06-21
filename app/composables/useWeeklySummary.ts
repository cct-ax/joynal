import type { WeeklySummaryData, WeeklySummaryGetResponse } from '#shared/types/api'

/**
 * 週次 AI サマリーの取得・生成 composable。
 *
 * - GET（keyed useAsyncData('weekly-summary')・server:false）でキャッシュ済みサマリーと
 *   鮮度判定用の日報 max(updated_at) を取得する。`enabled` が false / userId 未定なら取得しない。
 * - `stale`＝保存時の日報より新しい日報があるか（再生成を促すため）。
 * - `generate()`＝POST で生成/再生成（ミューテーション・useApiError でラップ）。
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
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
  generate: () => Promise<void>
  refresh: () => Promise<void>
} => {
  const requestFetch = useRequestFetch()
  const apiError = useApiError()
  const generating = ref(false)

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
    try {
      const result = await $fetch<WeeklySummaryData>('/api/ai/weekly-summary', {
        method: 'POST',
        body: { userId: userId.value, weekStart: weekStart.value }
      })
      // 生成直後は最新の日報で要約済み＝鮮度OK にするため latest を生成基準に合わせる。
      data.value = { summary: result, latestReportUpdatedAt: result.sourceUpdatedAt }
    } catch (error: unknown) {
      apiError.notify(error, { fallback: 'サマリーの生成に失敗しました' })
    } finally {
      generating.value = false
    }
  }

  return { summary, stale, generating, status, generate, refresh }
}
