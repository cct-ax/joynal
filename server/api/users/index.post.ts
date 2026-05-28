import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Profile } from '#shared/types/models'
import { userCreateBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { name, email, role } = await parseBody(event, userCreateBodySchema)

  const client = await serverSupabaseClient(event)
  const { data: callerProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const serviceClient = serverSupabaseServiceRole(event)
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true
  })

  if (authError) {
    if (authError.status === 422) {
      throw createError({ statusCode: 409, message: '同じメールアドレスが既に存在します' })
    }
    console.error('[api/users POST] auth.admin.createUser', authError)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
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
    console.error('[api/users POST] profile insert', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  setResponseStatus(event, 201)
  return data
})
