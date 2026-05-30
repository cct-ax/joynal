import { serverSupabaseClient } from '#supabase/server'
import type { MentorAssignment } from '#shared/types/models'
import { assignmentUpsertBodySchema } from '#shared/types/schemas'

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
    if (error.code === '23503') {
      throw createError({ statusCode: 404, message: '指定されたユーザーが存在しません' })
    }
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/assignments PUT]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
