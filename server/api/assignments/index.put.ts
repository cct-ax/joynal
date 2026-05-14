import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MentorAssignment } from '#shared/types/models'
import type { AssignmentUpsertBody } from '#shared/types/api'

export default defineEventHandler<Promise<MentorAssignment>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { traineeId, mentorId, ojtId, year } = await readBody<AssignmentUpsertBody>(event)

  if (!traineeId) {
    throw createError({ statusCode: 400, message: 'traineeId は必須です' })
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(traineeId)) {
    throw createError({ statusCode: 400, message: 'traineeId は UUID 形式で指定してください' })
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
    console.error('[api/assignments PUT]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
