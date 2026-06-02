import { serverSupabaseClient } from '#supabase/server'
import type { DailyReport, DailyReportUpdate } from '#shared/types/models'
import { reportUpdateBodySchema, uuidSchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['reports'],
    summary: '日報更新',
    description:
      '新人が自分の日報のみ更新できる（RLS で強制）。date は変更不可。check_in/check_out が両方あるときのみ check_out > check_in を検証（JSON Schema には現れない）。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              check_in: { type: 'string', description: '出勤時刻 HH:MM' },
              check_out: { type: 'string', description: '退勤時刻 HH:MM（両方指定時は check_in より後）' },
              content: { type: 'string' },
              mood: { type: ['integer', 'null'], description: '気分（1〜5、null で解除）' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: '更新後の日報',
        content: {
          'application/json': {
            example: {
              id: 'uuid',
              user_id: 'uuid',
              date: '2026-05-19',
              check_in: '09:30:00',
              check_out: '18:30:00',
              content: '更新後の本文',
              mood: 3,
              created_at: '2026-05-19T09:00:00Z',
              updated_at: '2026-05-19T09:30:00Z'
            }
          }
        }
      },
      400: { description: 'check_out <= check_in / 不正な値' },
      401: { description: '未ログイン' },
      403: { description: '他ユーザーの日報を更新しようとした（RLS による）' },
      404: { description: '対象の日報が存在しない' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * PUT /api/reports/:id — 日報を部分更新する。
 * check_in/check_out を片方のみ更新する場合は既存値を読み出して出勤<退勤を検証する。
 * 更新権限は RLS に委譲（権限不足は 403、対象不存在は 404）。
 */
export default defineEventHandler<Promise<DailyReport>>(async (event) => {
  await serverUserId(event)

  const id = parseRouteParam(event, 'id', uuidSchema)
  const { check_in, check_out, content, mood } = await parseBody(event, reportUpdateBodySchema)

  const updates: DailyReportUpdate = {}
  if (check_in !== undefined) updates.check_in = check_in
  if (check_out !== undefined) updates.check_out = check_out
  if (content !== undefined) updates.content = content
  if (mood !== undefined) updates.mood = mood

  const client = await serverSupabaseClient(event)

  // check_in/check_out の片方のみ更新する場合、reportUpdateBodySchema の refine では
  // 出勤<退勤を検証できない（両方ボディに存在する時のみ比較）。既存値を読み出して突き合わせる。
  // DB の time は "HH:MM:SS"、ボディは検証済み "HH:MM" のため slice(0, 5) で揃えて比較する。
  if ((check_in === undefined) !== (check_out === undefined)) {
    const { data: current, error: fetchError } = await client
      .from('daily_reports')
      .select('check_in, check_out')
      .eq('id', id)
      .single()

    if (fetchError) {
      throwSupabaseError(fetchError, 'api/reports/:id PUT fetch', {
        PGRST116: { statusCode: 404, message: '日報が見つかりません' }
      })
    }

    const effectiveIn = (check_in ?? current.check_in).slice(0, 5)
    const effectiveOut = (check_out ?? current.check_out).slice(0, 5)
    if (effectiveOut <= effectiveIn) {
      throw createError({ statusCode: 400, message: '退勤時間は出勤時間より後を指定してください' })
    }
  }

  const { data, error } = await client.from('daily_reports').update(updates).eq('id', id).select().single()

  if (error) {
    throwSupabaseError(error, 'api/reports/:id PUT', {
      PGRST116: { statusCode: 404, message: '日報が見つかりません' }
    })
  }

  return data
})
