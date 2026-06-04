import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import { reportsQuerySchema } from '#shared/types/schemas'
import { parseYmd, addDays, formatYmd } from '#shared/utils/date'

defineRouteMeta({
  openAPI: {
    tags: ['reports'],
    summary: '週の日報一覧取得',
    description:
      '全ロール対象。新人は自分、メンター・OJT は担当新人、管理者は全員の日報を取得（RLS で強制）。メンター・OJT・管理者は userId 必須、新人は省略。',
    parameters: [
      {
        in: 'query',
        name: 'weekStart',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: '取得対象週の月曜日（YYYY-MM-DD）'
      },
      {
        in: 'query',
        name: 'userId',
        required: false,
        schema: { type: 'string', format: 'uuid' },
        description: '対象ユーザーID。新人は省略（自分のみ）'
      }
    ],
    responses: {
      200: {
        description: '日報一覧',
        content: {
          'application/json': {
            example: [
              {
                id: 'uuid',
                user_id: 'uuid',
                date: '2026-05-19',
                check_in: '09:00:00',
                check_out: '18:00:00',
                content: 'やったことの本文',
                mood: 4,
                created_at: '2026-05-19T09:00:00Z',
                updated_at: '2026-05-19T09:00:00Z'
              }
            ]
          }
        }
      },
      400: { description: 'weekStart が未指定または不正な日付形式' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人を指定（RLS による）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/** GET /api/reports — 指定週（weekStart〜+6日）の日報一覧。userId 指定で絞り込み可。行の可視範囲は RLS に委譲。 */
export default defineEventHandler<Promise<DailyReport[]>>(async (event) => {
  // 認証ゲート（未認証は 401）。行レベルの可視範囲は RLS に委譲する。
  await serverUserId(event)

  const { weekStart, userId } = parseQuery(event, reportsQuerySchema)

  const client = await serverSupabaseClient(event)

  const start = parseYmd(weekStart)
  if (!start) {
    throw createError({ statusCode: 400, message: 'weekStart の日付形式が不正です' })
  }
  const weekEndStr = formatYmd(addDays(start, 6))

  let queryBuilder = client
    .from('daily_reports')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekEndStr)
    .order('date', { ascending: true })

  if (userId) {
    queryBuilder = queryBuilder.eq('user_id', userId)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throwSupabaseError(error, 'api/reports GET')
  }

  return data
})
