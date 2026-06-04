import { serverSupabaseClient } from '#supabase/server'
import type { CommentWithCommenter } from '#shared/types/api'
import { commentsQuerySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['comments'],
    summary: '週次コメント取得',
    description:
      '全ロール対象。新人は自分宛、メンター・OJT は担当新人宛、管理者は全員のコメントを取得（RLS で強制）。commenter に投稿者の name / role を結合して返す。',
    parameters: [
      {
        in: 'query',
        name: 'weekStart',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: '対象週の月曜日（YYYY-MM-DD）'
      },
      {
        in: 'query',
        name: 'traineeId',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '対象新人のユーザーID'
      }
    ],
    responses: {
      200: {
        description: '週次コメント一覧',
        content: {
          'application/json': {
            example: [
              {
                id: 'uuid',
                week_start: '2026-05-19',
                trainee_id: 'uuid',
                commenter_id: 'uuid',
                commenter: { name: '田中 太郎', role: 'mentor' },
                content: '今週もよく頑張りました。',
                created_at: '2026-05-23T18:00:00Z',
                updated_at: '2026-05-23T18:00:00Z'
              }
            ]
          }
        }
      },
      400: { description: 'weekStart または traineeId が未指定' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人のコメントを取得しようとした（RLS による）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/** GET /api/comments — 指定週・新人の週次コメント一覧を投稿者プロフィール付きで返す。行の可視範囲は RLS に委譲。 */
export default defineEventHandler<Promise<CommentWithCommenter[]>>(async (event) => {
  await serverUserId(event)

  const { weekStart, traineeId } = parseQuery(event, commentsQuerySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('comments')
    .select(
      `
      id,
      week_start,
      trainee_id,
      commenter_id,
      content,
      created_at,
      updated_at,
      commenter:profiles!commenter_id(name, role)
    `
    )
    .eq('week_start', weekStart)
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: true })
    .overrideTypes<CommentWithCommenter[], { merge: false }>()

  if (error) {
    throwSupabaseError(error, 'api/comments GET')
  }

  return data
})
