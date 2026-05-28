import { serverSupabaseClient } from '#supabase/server'
import type { AssignmentForAdmin, AssignmentForMentor } from '#shared/types/api'
import { assignmentsMeQuerySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<AssignmentForAdmin[] | AssignmentForMentor[]>>(async (event) => {
  const userId = await serverUserId(event)

  const { year: yearInput } = parseQuery(event, assignmentsMeQuerySchema)
  const year = yearInput ?? new Date().getFullYear()

  const client = await serverSupabaseClient(event)
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('[api/assignments/me GET] profile fetch', profileError)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  if (profile.role === 'trainee') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  if (profile.role === 'admin') {
    const { data, error } = await client
      .from('mentor_assignments')
      .select(`
        trainee_id,
        mentor_id,
        ojt_id,
        year,
        trainee:profiles!mentor_assignments_trainee_id_fkey(name),
        mentor:profiles!mentor_assignments_mentor_id_fkey(name),
        ojt:profiles!mentor_assignments_ojt_id_fkey(name)
      `)
      .eq('year', year)
      .returns<AssignmentForAdmin[]>()

    if (error) {
      console.error('[api/assignments/me GET] admin query', error)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }

    return data
  }

  const { data, error } = await client
    .from('mentor_assignments')
    .select(`
      trainee_id,
      year,
      trainee:profiles!mentor_assignments_trainee_id_fkey(name, employee_id)
    `)
    .or(`mentor_id.eq.${userId},ojt_id.eq.${userId}`)
    .eq('year', year)
    .returns<AssignmentForMentor[]>()

  if (error) {
    console.error('[api/assignments/me GET] mentor query', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
