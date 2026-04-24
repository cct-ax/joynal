import { serverSupabaseClient } from '#supabase/server'
import type { MentorAssignment } from '~/types/models'
import type { AssignmentUpsertBody } from '~/types/api'

export default defineEventHandler<Promise<MentorAssignment>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const { traineeId, mentorId, ojtId, year } = await readBody<AssignmentUpsertBody>(event)

  if (!traineeId) {
    throw createError({ statusCode: 400, message: 'traineeId は必須です' })
  }

  const targetYear: number = year ?? new Date().getFullYear()

  const { data, error } = await client
    .from('mentor_assignments')
    .upsert(
      { trainee_id: traineeId, mentor_id: mentorId ?? null, ojt_id: ojtId ?? null, year: targetYear },
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
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
