import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import type { ReportCreateBody } from '#shared/types/api'

export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { date, check_in, check_out, content, mood } = await readBody<ReportCreateBody>(event)

  if (!date || !check_in || !check_out || !content) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: 'date は YYYY-MM-DD 形式で指定してください' })
  }

  const TIME_PATTERN = /^\d{2}:\d{2}$/
  if (!TIME_PATTERN.test(check_in) || !TIME_PATTERN.test(check_out)) {
    throw createError({ statusCode: 400, message: 'check_in / check_out は HH:MM 形式で指定してください' })
  }

  if (check_out <= check_in) {
    throw createError({ statusCode: 400, message: 'check_out は check_in より後の時間を指定してください' })
  }

  const { data, error } = await client
    .from('daily_reports')
    .insert({ user_id: user.id, date, check_in, check_out, content, mood })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, message: '同じ日付の日報が既に存在します' })
    }
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/reports POST]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  setResponseStatus(event, 201)
  return data
})
