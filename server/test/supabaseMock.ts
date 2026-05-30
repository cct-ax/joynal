import { vi } from 'vitest'

export type QueryResult<T = unknown> = { data: T, error: unknown, count?: number | null }

/**
 * `serverSupabaseClient(event)` の戻り値（Supabase クライアント）をモックする。
 *
 * - `client.from(table)` がチェーン可能なクエリビルダを返す
 * - 終端 `.single()` / `.maybeSingle()` / 直接 await で `result` を解決する
 * - クライアント自体は thenable にしない（`await serverSupabaseClient()` が
 *   ビルダを result に解決してしまわないように、from() の戻り（query）だけを thenable にする）
 *
 * 使い方:
 *   const { client, from, query } = createSupabaseClientMock({ data, error: null })
 *   serverSupabaseClientMock.mockResolvedValue(client)
 *   expect(from).toHaveBeenCalledWith('daily_reports')
 *   expect(query.insert).toHaveBeenCalledWith(...)
 */
export const createSupabaseClientMock = (result: QueryResult) => {
  const query: Record<string, unknown> = {}
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'or', 'in', 'is',
    'order', 'limit', 'range', 'returns', 'overrideTypes'
  ]
  for (const m of chainMethods) query[m] = vi.fn(() => query)
  query.single = vi.fn(() => Promise.resolve(result))
  query.maybeSingle = vi.fn(() => Promise.resolve(result))
  // .order() 等で終わり直接 await されるクエリに対応するため thenable にする
  query.then = (onFulfilled: (r: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)

  const from = vi.fn(() => query)
  const client = { from }
  return { client, from, query }
}

/** auth 操作（signInWithPassword 等）をモックする serverSupabaseClient。`auth.<method>` は { error } を返す。 */
export const createSupabaseAuthMock = (authResult: { error: unknown } = { error: null }) => {
  const auth = {
    signInWithPassword: vi.fn(() => Promise.resolve(authResult)),
    signOut: vi.fn(() => Promise.resolve(authResult)),
    resetPasswordForEmail: vi.fn(() => Promise.resolve(authResult)),
    updateUser: vi.fn(() => Promise.resolve(authResult))
  }
  const client = { auth }
  return { client, auth }
}
