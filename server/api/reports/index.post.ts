import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport } from '#shared/types/models'
import { reportCreateBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['reports'],
    summary: '日報作成',
    description:
      '新人のみ作成できる（RLS で強制）。check_out > check_in（Zod .refine で検証、JSON Schema には現れない）。同じ日付の日報が既にある場合は 409。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['date', 'check_in', 'check_out', 'content'],
            properties: {
              date: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
              check_in: { type: 'string', description: '出勤時刻 HH:MM（15分単位）' },
              check_out: { type: 'string', description: '退勤時刻 HH:MM（15分単位、check_in より後）' },
              content: { type: 'string', description: 'やったこと' },
              mood: { type: 'integer', enum: [1, 2, 3, 4, 5], description: '気分（任意・1〜5）' }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: '作成された日報',
        content: {
          'application/json': {
            example: {
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
          }
        }
      },
      400: { description: '必須項目不足 / check_out <= check_in / 不正な形式' },
      401: { description: '未ログイン' },
      403: { description: '新人以外が呼び出した（RLS による）' },
      409: { description: '同じ日付の日報が既に存在する' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * POST /api/reports — 日報を新規作成し 201 を返す。
 * user_id はサーバー側でセッションから付与。日付重複は 409、書き込み権限は RLS に委譲（権限不足は 403）。
 */
export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  const userId = await serverUserId(event)

  const { date, check_in, check_out, content, mood } = await parseBody(event, reportCreateBodySchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('daily_reports')
    .insert({ user_id: userId, date, check_in, check_out, content, mood })
    .select()
    .single()

  if (error) {
    throwSupabaseError(error, 'api/reports POST', {
      23505: { statusCode: 409, message: '同じ日付の日報が既に存在します' }
    })
  }

  setResponseStatus(event, 201)
  return data
})
