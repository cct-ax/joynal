import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { DailyReport, DailyReportUpdate } from '#shared/types/models'
import type { ReportUpdateBody } from '#shared/types/api'

export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const id = getRouterParam(event, 'id')
  const { check_in, check_out, content, mood } = await readBody<ReportUpdateBody>(event)

  const TIME_PATTERN = /^\d{2}:\d{2}$/
  if ((check_in !== undefined && !TIME_PATTERN.test(check_in)) || (check_out !== undefined && !TIME_PATTERN.test(check_out))) {
    throw createError({ statusCode: 400, message: 'check_in / check_out は HH:MM 形式で指定してください' })
  }

  if (check_in && check_out && check_out <= check_in) {
    throw createError({ statusCode: 400, message: 'check_out は check_in より後の時間を指定してください' })
  }

  const updates: DailyReportUpdate = {}
  if (check_in !== undefined) updates.check_in = check_in
  if (check_out !== undefined) updates.check_out = check_out
  if (content !== undefined) updates.content = content
  if (mood !== undefined) updates.mood = mood

  const { data, error } = await client
    .from('daily_reports')
    .update(updates)
    .eq('id', id!)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({ statusCode: 404, message: '日報が見つかりません' })
    }
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/reports/:id PUT]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
