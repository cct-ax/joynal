const VALID_ROLES = ['trainee', 'mentor', 'ojt', 'admin'] as const

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)

  const { name, email, role } = body ?? {}

  if (!name || !email || !role) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  if (!VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'role は trainee / mentor / ojt / admin のいずれかを指定してください' })
  }

  const serviceClient = await serverSupabaseServiceRole(event)

  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw createError({ statusCode: 409, message: '同じメールアドレスが既に存在します' })
    }
    throw createError({ statusCode: 500, message: authError.message })
  }

  const { data, error } = await client
    .from('profiles')
    .insert({ id: authUser.user.id, name, email, role })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  setResponseStatus(event, 201)
  return data
})
