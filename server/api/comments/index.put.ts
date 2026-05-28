import { serverSupabaseClient } from '#supabase/server'
import type { Comment } from '#shared/types/models'
import { commentUpsertBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<Comment>>(async (event) => {
  const userId = await serverUserId(event)

  const { weekStart, traineeId, content } = await parseBody(event, commentUpsertBodySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('comments')
    .upsert(
      { week_start: weekStart, trainee_id: traineeId, commenter_id: userId, content },
      { onConflict: 'week_start,trainee_id,commenter_id' }
    )
    .select()
    .single()

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/comments PUT]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
