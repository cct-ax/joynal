import type { TablesUpdate } from '~/types/database.types'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

const VALID_ROLES = ['trainee', 'mentor', 'ojt', 'admin'] as const

// 実質的な永久 ban として十分な期間（Supabase は 'none' で解除、それ以外は PostgreSQL interval 文字列）
const BAN_DURATION_PERMANENT = '876000h' // 100年

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { name, email, role, is_active } = body ?? {}

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'role は trainee / mentor / ojt / admin のいずれかを指定してください' })
  }

  const updates: TablesUpdate<'profiles'> = {}
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
