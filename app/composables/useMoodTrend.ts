import type { MoodTrendPoint } from '#shared/types/api'
import { defaultMoodRange, buildMoodSeries, type MoodChartPoint } from '../utils/moodChart'

/**
 * 選択中ユーザーの mood 推移を取得する composable（メンター向け週次サマリーで使用）。
 *
 * - 表示範囲は現在週（月曜）から weeks 週ぶん（既定 8 週）。currentWeekStart の変化で再取得する。
 * - keyed useAsyncData('mood-trend') で重複排除。`enabled` が false の間は API を叩かず空配列。
 * - `userId` が undefined のときは query から userId を省く（trainee は本人にサーバー解決）。
 * - server:false ＝ SSR では assignments 選択が解決する前に走るため、クライアントで取得する
 *   （useWeeklyReports と同方針・hydration mismatch 回避）。useRequestFetch で Cookie を転送。
 * - `series` は平日を網羅した連続系列（mood 未入力日は null＝チャートのギャップ）。
 */
export const useMoodTrend = (
  currentWeekStart: Ref<Date>,
  userId: Ref<string | undefined>,
  enabled: Ref<boolean>,
  weeks = 8
): {
  points: Ref<MoodTrendPoint[]>
  series: ComputedRef<MoodChartPoint[]>
  range: ComputedRef<{ from: string, to: string }>
  refresh: () => Promise<void>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
} => {
  const requestFetch = useRequestFetch()

  const range = computed(() => defaultMoodRange(currentWeekStart.value, weeks))

  const { data, refresh, status } = useAsyncData<MoodTrendPoint[]>(
    'mood-trend',
    async () => {
      if (!enabled.value) return []
      return await requestFetch<MoodTrendPoint[]>('/api/reports/mood-trend', {
        query: {
          from: range.value.from,
          to: range.value.to,
          ...(userId.value ? { userId: userId.value } : {})
        }
      })
    },
    { watch: [range, userId, enabled], default: () => [], server: false }
  )

  const series = computed<MoodChartPoint[]>(() =>
    buildMoodSeries(data.value ?? [], range.value.from, range.value.to)
  )

  return { points: data, series, range, refresh, status }
}
