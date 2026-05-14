import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { CommentWithCommenter, CommentsQuery } from '#shared/types/api'

export default defineEventHandler<Promise<CommentWithCommenter[]>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { weekStart, traineeId } = getQuery(event) as Partial<CommentsQuery>

  if (!weekStart || !traineeId) {
    throw createError({ statusCode: 400, message: 'weekStart と traineeId は必須です' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw createError({ statusCode: 400, message: 'weekStart は YYYY-MM-DD 形式で指定してください' })
  }

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

  if (error) {
    console.error('[api/comments GET]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data as CommentWithCommenter[]
})
