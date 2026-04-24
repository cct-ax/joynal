const VALID_ROLES = ['trainee', 'mentor', 'ojt', 'admin'] as const

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { name, email, role, is_active } = body ?? {}

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'role は trainee / mentor / ojt / admin のいずれかを指定してください' })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = is_active

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', id!)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({ statusCode: 404, message: 'ユーザーが見つかりません' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  if (is_active === false) {
    const serviceClient = await serverSupabaseServiceRole(event)
    const { error: banError } = await serviceClient.auth.admin.updateUserById(id!, { ban_duration: 'none' })
    if (banError) {
      throw createError({ statusCode: 500, message: banError.message })
    }
  }

  return data
})
