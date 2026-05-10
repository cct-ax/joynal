import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Profile, ProfileUpdate } from '#shared/types/models'
import { VALID_ROLES } from '#shared/types/api'
import type { UserUpdateBody } from '#shared/types/api'

// 実質的な永久 ban（Supabase は 'none' で解除、それ以外は PostgreSQL interval 文字列）
const BAN_DURATION_PERMANENT = '876000h'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { data: callerProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const id = getRouterParam(event, 'id')
  const { name, email, role, is_active } = await readBody<UserUpdateBody>(event)

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'role は trainee / mentor / ojt / admin のいずれかを指定してください' })
  }

  const updates: ProfileUpdate = {}
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
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  if (is_active !== undefined) {
    const serviceClient = serverSupabaseServiceRole(event)
    const banDuration = is_active ? 'none' : BAN_DURATION_PERMANENT
    const { error: banError } = await serviceClient.auth.admin.updateUserById(id!, { ban_duration: banDuration })
    if (banError) {
      throw createError({ statusCode: 500, message: banError.message })
    }
  }

  return data
})
