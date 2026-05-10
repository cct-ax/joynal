import { serverSupabaseClient } from '#supabase/server'
import type { Profile } from '#shared/types/models'

export default defineEventHandler<Promise<Profile[]>>(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('profiles')
    .select('id, employee_id, name, email, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
