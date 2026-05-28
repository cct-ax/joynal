/**
 * Nuxt の `$fetch` (h3 / ofetch) が throw するエラーから
 * statusCode と data.message を安全に取り出す type guard ユーティリティ。
 *
 * 本ファイル内で 1 箇所だけ `as` を使うが、戻り値の type predicate で
 * 保証された絞り込みなので、利用側はキャスト不要で扱える。
 */

type FetchErrorShape = {
  statusCode: number
  data?: { message?: string }
}

/**
 * unknown が Nuxt の FetchError 形状（statusCode を持つオブジェクト）か判定する。
 * - 型述語のために type guard 内部で 1 箇所だけ unsafe cast を許容する
 */
export const isFetchError = (error: unknown): error is FetchErrorShape => {
  if (typeof error !== 'object' || error === null) return false
  if (!('statusCode' in error)) return false
  const statusCode = (error as { statusCode: unknown }).statusCode
  return typeof statusCode === 'number'
}

/** FetchError から statusCode を取り出す。それ以外は null */
export const getFetchStatus = (error: unknown): number | null =>
  isFetchError(error) ? error.statusCode : null

/** FetchError の `data.message` を取り出す。string 以外は null */
export const getFetchMessage = (error: unknown): string | null => {
  if (!isFetchError(error)) return null
  const message = error.data?.message
  return typeof message === 'string' ? message : null
}
