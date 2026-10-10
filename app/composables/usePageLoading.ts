import type { ComputedRef, MaybeRefOrGetter } from 'vue'

/**
 * ページ全体のローディング状態を複数の条件から導出する。
 *
 * - `!mounted.value || profilePending.value || ...Pending.value` のような boolean 群を
 *   OR で 1 つの `ComputedRef<boolean>` に集約し、テンプレートの条件式を簡潔にする。
 * - 受け取るのはいずれも boolean を返す ref / getter（`MaybeRefOrGetter<boolean>`）。
 *   status 文字列の比較などは呼び出し側で `() => status.value === 'pending'` 等に
 *   変換して渡す。
 * - いずれか 1 つでも true なら全体を true（＝ローディング中）とみなす。
 *
 * 例:
 *   const isLoading = usePageLoading(
 *     () => !mounted.value,
 *     profilePending,
 *     () => reportsStatus.value === 'pending'
 *   )
 */
export const usePageLoading = (
  ...conditions: MaybeRefOrGetter<boolean>[]
): ComputedRef<boolean> => computed(() => conditions.some(c => toValue(c)))
