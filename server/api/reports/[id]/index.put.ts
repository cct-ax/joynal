import type { TablesUpdate } from '~/types/database.types'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { check_in, check_out, content, mood } = body ?? {}

  if (check_in && check_out && check_out <= check_in) {
    throw createError({ statusCode: 400, message: 'check_out は check_in より後の時間を指定してください' })
  }

  const updates: TablesUpdate<'daily_reports'> = {}
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
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
