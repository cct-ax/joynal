import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport, DailyReportUpdate } from '#shared/types/models'
import { reportUpdateBodySchema, uuidSchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  await serverUserId(event)

  const id = parseRouteParam(event, 'id', uuidSchema)
  const { check_in, check_out, content, mood } = await parseBody(event, reportUpdateBodySchema)

  const updates: DailyReportUpdate = {}
  if (check_in !== undefined) updates.check_in = check_in
  if (check_out !== undefined) updates.check_out = check_out
  if (content !== undefined) updates.content = content
  if (mood !== undefined) updates.mood = mood

  const client = await serverSupabaseClient(event)

  // check_in/check_out の片方のみ更新する場合、reportUpdateBodySchema の refine では
  // 出勤<退勤を検証できない（両方ボディに存在する時のみ比較）。既存値を読み出して突き合わせる。
  // DB の time は "HH:MM:SS"、ボディは検証済み "HH:MM" のため slice(0, 5) で揃えて比較する。
  if ((check_in === undefined) !== (check_out === undefined)) {
    const { data: current, error: fetchError } = await client
      .from('daily_reports')
      .select('check_in, check_out')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({ statusCode: 404, message: '日報が見つかりません' })
      }
      if (fetchError.code === '42501') {
        throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
      }
      console.error('[api/reports/:id PUT] fetch', fetchError)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }

    const effectiveIn = (check_in ?? current.check_in).slice(0, 5)
    const effectiveOut = (check_out ?? current.check_out).slice(0, 5)
    if (effectiveOut <= effectiveIn) {
      throw createError({ statusCode: 400, message: '退勤時間は出勤時間より後を指定してください' })
    }
  }

  const { data, error } = await client
    .from('daily_reports')
    .update(updates)
    .eq('id', id)
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
