import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Comment } from '#shared/types/models'
import type { CommentUpsertBody } from '#shared/types/api'

export default defineEventHandler<Promise<Comment>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { weekStart, traineeId, content } = await readBody<CommentUpsertBody>(event)

  if (!weekStart || !traineeId || !content) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw createError({ statusCode: 400, message: 'weekStart は YYYY-MM-DD 形式で指定してください' })
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(traineeId)) {
    throw createError({ statusCode: 400, message: 'traineeId は UUID 形式で指定してください' })
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
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/comments PUT]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
