import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import { reportsQuerySchema } from '#shared/types/schemas'
import { parseYmd, addDays, formatYmd } from '#shared/utils/date'

export default defineEventHandler<Promise<DailyReport[]>>(async (event) => {
  // 認証ゲート（未認証は 401）。行レベルの可視範囲は RLS に委譲する。
  await serverUserId(event)

  const { weekStart, userId } = parseQuery(event, reportsQuerySchema)

  const client = await serverSupabaseClient(event)

  const start = parseYmd(weekStart)
  if (!start) {
    throw createError({ statusCode: 400, message: 'weekStart の日付形式が不正です' })
  }
  const weekEndStr = formatYmd(addDays(start, 6))

  let queryBuilder = client
    .from('daily_reports')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekEndStr)
    .order('date', { ascending: true })

  if (userId) {
    queryBuilder = queryBuilder.eq('user_id', userId)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('[api/reports GET]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
