import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile, ProfileUpdate } from '#shared/types/models'
import { userUpdateBodySchema, uuidSchema } from '#shared/types/schemas'

// 実質的な永久 ban（Supabase は 'none' で解除、それ以外は PostgreSQL interval 文字列）
const BAN_DURATION_PERMANENT = '876000h'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const userId = await serverUserId(event)

  const client = await serverSupabaseClient(event)
  const { data: callerProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const id = parseRouteParam(event, 'id', uuidSchema)
  const { name, email, role, is_active } = await parseBody(event, userUpdateBodySchema)

  const updates: ProfileUpdate = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = is_active

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({ statusCode: 404, message: 'ユーザーが見つかりません' })
    }
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/users/:id PUT] profile update', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  if (is_active !== undefined) {
    const serviceClient = serverSupabaseServiceRole(event)
    const banDuration = is_active ? 'none' : BAN_DURATION_PERMANENT
    const { error: banError } = await serviceClient.auth.admin.updateUserById(id, { ban_duration: banDuration })
    if (banError) {
      console.error('[api/users/:id PUT] auth.admin.updateUserById', banError)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }
  }

  return data
})
