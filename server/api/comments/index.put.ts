import { serverSupabaseClient } from '#supabase/server'
import type { Comment } from '#shared/types/models'
import { commentUpsertBodySchema } from '#shared/types/schemas'

/**
 * PUT /api/comments — 週次コメントを upsert する（week_start + trainee_id + commenter_id が一意キー）。
 * commenter_id はサーバー側でセッションから取得し、書き込み権限は RLS に委譲（権限不足は 403）。
 */
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
    throwSupabaseError(error, 'api/comments PUT')
  }

  return data
})
