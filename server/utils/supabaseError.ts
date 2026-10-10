/** Supabase クエリエラーのうち本ユーティリティが参照する最小形（@supabase/supabase-js を直接 import しない）。 */
export type SupabaseQueryError = { code: string, message: string }

// 文言が固定で使い回せる PG コードのデフォルト
const PG_DEFAULTS: Record<string, { statusCode: number, message: string }> = {
  42501: { statusCode: 403, message: 'アクセス権限がありません' },
  PGRST116: { statusCode: 404, message: 'リソースが見つかりません' }
}

type ErrorInput = Parameters<typeof createError>[0]

/**
 * PostgrestError を HTTP エラーに変換して必ず throw する（戻り値 never）。
 * - overrides[code] があれば最優先（23505 等の可変文言・data 構造付きはここで渡す）
 * - PG_DEFAULTS にあれば既定の {statusCode,message}
 * - どちらも無ければ context 付きで console.error し 500
 */
export const throwSupabaseError = (
  error: SupabaseQueryError,
  context: string,
  overrides?: Record<string, ErrorInput>
): never => {
  const override = overrides?.[error.code]
  if (override) throw createError(override)
  const mapped = PG_DEFAULTS[error.code]
  if (mapped) throw createError(mapped)
  console.error(`[${context}]`, error)
  throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
}
