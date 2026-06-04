import { serverSupabaseClient } from '#supabase/server'
import type { MentorAssignment } from '#shared/types/models'
import { assignmentUpsertBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['assignments'],
    summary: 'メンター割り当て更新（upsert）',
    description:
      '管理者のみ。(traineeId, year) が既存なら上書き、無ければ新規作成。year 省略時は現在年度を自動セット。mentorId / ojtId は null で未割り当てを表す。存在しない ID は 404。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['traineeId', 'mentorId', 'ojtId'],
            properties: {
              traineeId: { type: 'string', format: 'uuid' },
              mentorId: { type: ['string', 'null'], format: 'uuid' },
              ojtId: { type: ['string', 'null'], format: 'uuid' },
              year: { type: 'integer', description: '年度（省略時は現在年度）' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: '保存後の割り当てレコード',
        content: {
          'application/json': { example: { trainee_id: 'uuid', mentor_id: 'uuid', ojt_id: 'uuid', year: 2026 } }
        }
      },
      400: { description: 'traineeId が未指定' },
      401: { description: '未ログイン' },
      403: { description: '管理者以外が呼び出した（RLS による）' },
      404: { description: 'traineeId / mentorId / ojtId が存在しない' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * PUT /api/assignments — メンター/OJT 割り当てを upsert する（trainee_id + year が一意キー）。
 * 管理者専用エンドポイントのため、他の管理 API（users 系）と同様に assertAdminRole で
 * サーバー側でも明示的にガードする（RLS の WITH CHECK(is_admin()) と二重防御）。
 * 非管理者は 403、ユーザー不在は 404 を返す。
 */
export default defineEventHandler<Promise<MentorAssignment>>(async (event) => {
  await assertAdminRole(event)

  const { traineeId, mentorId, ojtId, year } = await parseBody(event, assignmentUpsertBodySchema)

  const targetYear: number = resolveYear(year)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('mentor_assignments')
    .upsert(
      { trainee_id: traineeId, mentor_id: mentorId, ojt_id: ojtId, year: targetYear },
      { onConflict: 'trainee_id,year' }
    )
    .select()
    .single()

  if (error) {
    throwSupabaseError(error, 'api/assignments PUT', {
      23503: { statusCode: 404, message: '指定されたユーザーが存在しません' }
    })
  }

  return data
})
