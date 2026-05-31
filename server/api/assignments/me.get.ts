import { serverSupabaseClient } from '#supabase/server'
import type { AssignmentForAdmin, AssignmentForMentor } from '#shared/types/api'
import { assignmentsMeQuerySchema, uuidSchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<AssignmentForAdmin[] | AssignmentForMentor[]>>(async (event) => {
  const userId = await serverUserId(event)

  // 防御的検証: userId は検証済み JWT の sub だが、後段の mentor/ojt 経路で PostgREST の
  // .or() フィルタに文字列補間する。UUID 形状なら PostgREST のメタ文字（, . ( ) :）を
  // 含み得ないため補間が安全になる。万一形状が壊れていれば未認証として弾く。
  if (!uuidSchema.safeParse(userId).success) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { year: yearInput } = parseQuery(event, assignmentsMeQuerySchema)
  const year = resolveYear(yearInput)

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
      .overrideTypes<AssignmentForAdmin[], { merge: false }>()

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
    .overrideTypes<AssignmentForMentor[], { merge: false }>()

  if (error) {
    console.error('[api/assignments/me GET] mentor query', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
