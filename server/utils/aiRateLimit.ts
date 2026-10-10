import type { H3Event } from 'h3'
import type { Database } from '#shared/types/database.types'
import { serverSupabaseClient } from '#supabase/server'

/** serverSupabaseClient<Database> の戻り型（@supabase/supabase-js を直接 import しない）。 */
type ServerSupabaseClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

/**
 * AI 呼び出しの per-user 日次ソフトレート上限。
 *
 * coach / weekly-summary が AI を呼ぶ前に当日の利用回数を確認し、上限内なら +1 する。
 * コスト・無料枠保護が目的。取得→upsert は厳密 atomic ではない（ソフト上限）。
 * テスト容易性のため「config 解決」と「DB 操作」を分離する（runtimeConfig 依存はテストで stub 不可なため）。
 */

/** runtimeConfig から1日あたりの AI 呼び出し上限を解決する（未設定/不正は既定 50）。 */
export const resolveDailyLimit = (event: H3Event): number => {
  const limit = useRuntimeConfig(event).aiDailyLimit
  return typeof limit === 'number' && limit > 0 ? limit : 50
}

/**
 * 当日の AI 利用回数を確認し、上限内ならインクリメントする。
 * 上限到達は 429（AI_RATE_LIMIT）。client を引数で受けるため単体テスト可能。
 */
export const checkAndIncrementUsage = async (
  client: ServerSupabaseClient,
  userId: string,
  limit: number,
  today: string
): Promise<void> => {
  const { data, error } = await client
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle()
  if (error) throwSupabaseError(error, 'api/ai ai_usage select')

  const current = data?.count ?? 0
  if (current >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: { message: `本日の AI 利用上限（${limit} 回）に達しました。明日また利用できます`, code: 'AI_RATE_LIMIT' }
    })
  }

  const { error: upsertError } = await client
    .from('ai_usage')
    .upsert({ user_id: userId, usage_date: today, count: current + 1 }, { onConflict: 'user_id,usage_date' })
  if (upsertError) throwSupabaseError(upsertError, 'api/ai ai_usage upsert')
}

/** 認証済みユーザーの当日 AI 利用をチェック＆記録する（ハンドラから auto-import で呼ぶ合成関数）。 */
export const assertWithinDailyLimit = async (event: H3Event, userId: string): Promise<void> => {
  const client = await serverSupabaseClient<Database>(event)
  const today = new Date().toISOString().slice(0, 10)
  await checkAndIncrementUsage(client, userId, resolveDailyLimit(event), today)
}
