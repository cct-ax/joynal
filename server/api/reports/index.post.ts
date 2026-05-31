import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import { reportCreateBodySchema } from '#shared/types/schemas'

/**
 * POST /api/reports — 日報を新規作成し 201 を返す。
 * user_id はサーバー側でセッションから付与。日付重複は 409、書き込み権限は RLS に委譲（権限不足は 403）。
 */
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
    throwSupabaseError(error, 'api/reports POST', {
      23505: { statusCode: 409, message: '同じ日付の日報が既に存在します' }
    })
  }

  setResponseStatus(event, 201)
  return data
})
