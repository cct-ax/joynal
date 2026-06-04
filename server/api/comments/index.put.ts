import { serverSupabaseClient } from '#supabase/server'
import type { Comment } from '#shared/types/models'
import { commentUpsertBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['comments'],
    summary: '週次コメント保存（upsert）',
    description:
      'メンター・OJT のみ。(weekStart, traineeId, commenterId) が既存なら上書き、無ければ新規作成。担当外の新人へのコメントや権限の無いロールは RLS で 403。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['weekStart', 'traineeId', 'content'],
            properties: {
              weekStart: { type: 'string', format: 'date', description: '対象週の月曜日 YYYY-MM-DD' },
              traineeId: { type: 'string', format: 'uuid' },
              content: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: '保存後のコメント（commenter フィールドなし）',
        content: {
          'application/json': {
            example: {
              id: 'uuid',
              week_start: '2026-05-19',
              trainee_id: 'uuid',
              commenter_id: 'uuid',
              content: '今週のコメント本文',
              created_at: '2026-05-23T18:00:00Z',
              updated_at: '2026-05-23T18:00:00Z'
            }
          }
        }
      },
      400: { description: '必須項目不足' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人 / メンター・OJT 以外のロール（RLS による）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

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
