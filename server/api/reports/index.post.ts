import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import { reportCreateBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  const userId = await serverUserId(event)

  const { date, check_in, check_out, content, mood } = await parseBody(event, reportCreateBodySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('daily_reports')
    .insert({ user_id: userId, date, check_in, check_out, content, mood })
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
