import { serverSupabaseClient } from '#supabase/server'
import type { CommentWithCommenter } from '#shared/types/api'
import { commentsQuerySchema } from '#shared/types/schemas'

/** GET /api/comments — 指定週・新人の週次コメント一覧を投稿者プロフィール付きで返す。行の可視範囲は RLS に委譲。 */
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
    .overrideTypes<CommentWithCommenter[], { merge: false }>()

  if (error) {
    throwSupabaseError(error, 'api/comments GET')
  }

  return data
})
