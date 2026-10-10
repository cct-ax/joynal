import { serverSupabaseClient } from '#supabase/server'
import type { MoodTrendPoint } from '#shared/types/api'
import { isMoodValue } from '#shared/types/api'
import { moodTrendQuerySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['reports'],
    summary: 'mood 推移取得',
    description:
      '指定期間（from〜to）の日次 mood を取得する。新人は自分、メンター・OJT は担当新人、管理者は全員（RLS で強制）。mood 未入力の日は含めない。メンター・OJT・管理者は userId 必須、新人は省略。',
    parameters: [
      {
        in: 'query',
        name: 'from',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: '取得開始日（YYYY-MM-DD・両端含む）'
      },
      {
        in: 'query',
        name: 'to',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: '取得終了日（YYYY-MM-DD・両端含む）'
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
        description: 'mood 推移（日付昇順・mood は 1〜5）',
        content: {
          'application/json': {
            example: [
              { date: '2026-05-18', mood: 4 },
              { date: '2026-05-19', mood: 3 }
            ]
          }
        }
      },
      400: { description: 'from / to が未指定または不正な日付形式' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人を指定（RLS による）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * GET /api/reports/mood-trend — 指定期間の日次 mood 推移。
 * 行の可視範囲は RLS に委譲。mood 未入力（NULL）の日は除外して返す。
 */
export default defineEventHandler<Promise<MoodTrendPoint[]>>(async (event) => {
  // 認証ゲート（未認証は 401）。行レベルの可視範囲は RLS に委譲する。
  await serverUserId(event)

  const { from, to, userId } = parseQuery(event, moodTrendQuerySchema)

  const client = await serverSupabaseClient(event)

  let queryBuilder = client
    .from('daily_reports')
    .select('date, mood')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (userId) {
    queryBuilder = queryBuilder.eq('user_id', userId)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throwSupabaseError(error, 'api/reports/mood-trend GET')
  }

  // mood 未入力（NULL）の日を除外し、型を MoodValue に絞り込む（as を使わず type guard で）。
  const points: MoodTrendPoint[] = []
  for (const row of data ?? []) {
    if (isMoodValue(row.mood)) {
      points.push({ date: row.date, mood: row.mood })
    }
  }
  return points
})
