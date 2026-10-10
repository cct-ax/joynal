import type { DailyReport } from '#shared/types/models'

/**
 * 指定週・指定ユーザーの日報を取得する composable。
 *
 * - keyed useAsyncData('reports-week') で重複排除し、weekStartYmd / userId / enabled の
 *   変化で自動再フェッチする。
 * - `enabled` が false の間は API を叩かず空配列を返す
 *   （管理者が新人未選択のとき等、取得すべき対象が未確定なケース）。
 * - `userId` が undefined のときは query から userId を省く
 *   （trainee は自分の日報＝サーバー側で本人に解決されるため）。
 *
 * 設計判断: useRequestFetch で SSR の Cookie を転送する（useCurrentUser と同方針）。
 */
export const useWeeklyReports = (
  weekStartYmd: Ref<string>,
  userId: Ref<string | undefined>,
  enabled: Ref<boolean>
): {
  reports: Ref<DailyReport[]>
  reportByDate: ComputedRef<Record<string, DailyReport>>
  refresh: () => Promise<void>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
} => {
  const requestFetch = useRequestFetch()

  const { data, refresh, status } = useAsyncData<DailyReport[]>(
    'reports-week',
    async () => {
      if (!enabled.value) return []
      return await requestFetch<DailyReport[]>('/api/reports', {
        query: {
          weekStart: weekStartYmd.value,
          ...(userId.value ? { userId: userId.value } : {})
        }
      })
    },
    // server: false — SSR では担当新人(assignments)が解決する前に走って空を掴むため、
    // クライアントで取得する。クライアントでは userId/enabled が確定済みで watch も発火する。
    { watch: [weekStartYmd, userId, enabled], default: () => [], server: false }
  )

  // 日付索引で O(1) 参照（report.date をキーにする）。
  const reportByDate = computed<Record<string, DailyReport>>(() =>
    Object.fromEntries((data.value ?? []).map(r => [r.date, r]))
  )

  return { reports: data, reportByDate, refresh, status }
}
