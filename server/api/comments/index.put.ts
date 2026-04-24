import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Tables } from '~/types/database.types'
import type { UpsertCommentBody } from '#server/types/api'

export default defineEventHandler<Promise<Tables<'comments'>>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { weekStart, traineeId, content } = await readBody<UpsertCommentBody>(event)

  if (!weekStart || !traineeId || !content) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  const { data, error } = await client
    .from('comments')
    .upsert(
      { week_start: weekStart, trainee_id: traineeId, commenter_id: user.id, content },
      { onConflict: 'week_start,trainee_id,commenter_id' }
    )
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
