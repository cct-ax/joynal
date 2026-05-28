import { serverSupabaseClient } from '#supabase/server'
import type { CommentWithCommenter } from '#shared/types/api'
import { commentsQuerySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<CommentWithCommenter[]>>(async (event) => {
  await serverUserId(event)

  const { weekStart, traineeId } = parseQuery(event, commentsQuerySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('comments')
    .select(`
      id,
      week_start,
      trainee_id,
      commenter_id,
      content,
      created_at,
      updated_at,
      commenter:profiles!commenter_id(name, role)
    `)
    .eq('week_start', weekStart)
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: true })
    .returns<CommentWithCommenter[]>()

  if (error) {
    console.error('[api/comments GET]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
