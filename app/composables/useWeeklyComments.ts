import type { CommentWithCommenter } from '#shared/types/api'

/**
 * 指定週・指定新人の週次コメント（mentor / ojt）を取得する composable。
 *
 * - keyed useAsyncData('comments-week') で重複排除し、weekStartYmd / traineeId の
 *   変化で自動再フェッチする。
 * - `traineeId` が null（新人未選択）の間は API を叩かず空配列を返す。
 * - サーバーは作成順の配列を返すので、commenter.role で mentor / ojt に振り分ける。
 *
 * 設計判断: useRequestFetch で SSR の Cookie を転送する（useCurrentUser と同方針）。
 */
export const useWeeklyComments = (
  weekStartYmd: Ref<string>,
  traineeId: Ref<string | null>
): {
  mentorComment: ComputedRef<CommentWithCommenter | null>
  ojtComment: ComputedRef<CommentWithCommenter | null>
  refresh: () => Promise<void>
  comments: Ref<CommentWithCommenter[]>
} => {
  const requestFetch = useRequestFetch()

  const { data, refresh } = useAsyncData<CommentWithCommenter[]>(
    'comments-week',
    async () => {
      if (!traineeId.value) return []
      return await requestFetch<CommentWithCommenter[]>('/api/comments', {
        query: {
          weekStart: weekStartYmd.value,
          traineeId: traineeId.value
        }
      })
    },
    // server: false — reports と同様、対象新人が確定するクライアント側で取得する
    // （SSR では traineeId 解決前に走って空を掴み、再取得もされないため）。
    { watch: [weekStartYmd, traineeId], default: () => [], server: false }
  )

  const mentorComment = computed<CommentWithCommenter | null>(
    () => (data.value ?? []).find(c => c.commenter.role === 'mentor') ?? null
  )
  const ojtComment = computed<CommentWithCommenter | null>(
    () => (data.value ?? []).find(c => c.commenter.role === 'ojt') ?? null
  )

  return { mentorComment, ojtComment, refresh, comments: data }
}
