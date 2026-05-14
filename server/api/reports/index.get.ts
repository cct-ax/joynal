import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import type { ReportsQuery } from '#shared/types/api'

export default defineEventHandler<Promise<DailyReport[]>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const { weekStart, userId } = getQuery(event) as Partial<ReportsQuery>

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw createError({ statusCode: 400, message: 'weekStart は YYYY-MM-DD 形式で指定してください' })
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]!

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
