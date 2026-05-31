import { serverSupabaseClient } from '#supabase/server'
import type { MentorAssignment } from '#shared/types/models'
import { assignmentUpsertBodySchema } from '#shared/types/schemas'

/**
 * PUT /api/assignments — メンター/OJT 割り当てを upsert する（trainee_id + year が一意キー）。
 * 認可は RLS に委譲（管理者のみ INSERT/UPDATE 可）。ユーザー不在は 404、権限不足は 403 を返す。
 */
export default defineEventHandler<Promise<MentorAssignment>>(async (event) => {
  await serverUserId(event)

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
