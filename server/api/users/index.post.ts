import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Profile } from '#shared/types/models'
import { VALID_ROLES } from '#shared/types/api'
import type { UserCreateBody } from '#shared/types/api'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { name, email, role } = await readBody<UserCreateBody>(event)

  if (!name || !email || !role) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  if (!VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'role は trainee / mentor / ojt / admin のいずれかを指定してください' })
  }

  const serviceClient = serverSupabaseServiceRole(event)

  const { data: callerProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true
  })

  if (authError) {
    if (authError.status === 422) {
      throw createError({ statusCode: 409, message: '同じメールアドレスが既に存在します' })
    }
    throw createError({ statusCode: 500, message: authError.message })
  }

  const { data: lastUser } = await client
    .from('profiles')
    .select('employee_id')
    .order('employee_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNum = lastUser ? parseInt(lastUser.employee_id.replace(/\D/g, ''), 10) + 1 : 1
  const employee_id = `E${String(nextNum).padStart(3, '0')}`

  const { data, error } = await client
    .from('profiles')
    .insert({ id: authUser.user.id, name, email, role, employee_id })
    .select()
    .single()

  if (error) {
    await serviceClient.auth.admin.deleteUser(authUser.user.id)
    throw createError({ statusCode: 500, message: error.message })
  }

  setResponseStatus(event, 201)
  return data
})
