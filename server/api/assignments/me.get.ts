import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { AssignmentForAdmin, AssignmentForMentor, AssignmentsMeQuery } from '#shared/types/api'

export default defineEventHandler<Promise<AssignmentForAdmin[] | AssignmentForMentor[]>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { year: yearStr } = getQuery(event) as Partial<AssignmentsMeQuery>
  const year = yearStr ? Number(yearStr) : new Date().getFullYear()

  if (Number.isNaN(year)) {
    throw createError({ statusCode: 400, message: 'year は数値で指定してください' })
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
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

    if (error) {
      console.error('[api/assignments/me GET] admin query', error)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }

    return data as AssignmentForAdmin[]
  }

  const { data, error } = await client
    .from('mentor_assignments')
    .select(`
      trainee_id,
      year,
      trainee:profiles!mentor_assignments_trainee_id_fkey(name, employee_id)
    `)
    .or(`mentor_id.eq.${user.id},ojt_id.eq.${user.id}`)
    .eq('year', year)

  if (error) {
    console.error('[api/assignments/me GET] mentor query', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data as AssignmentForMentor[]
})
