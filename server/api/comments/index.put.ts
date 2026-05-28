import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Comment } from '#shared/types/models'
import { commentUpsertBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<Comment>>(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { weekStart, traineeId, content } = await parseBody(event, commentUpsertBodySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('comments')
    .upsert(
      { week_start: weekStart, trainee_id: traineeId, commenter_id: user.id, content },
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
