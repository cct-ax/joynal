import { serverSupabaseClient } from '#supabase/server'
import type { CurrentUserProfile } from '#shared/types/api'

/** GET /api/users/me — ログインユーザー自身のプロフィールを返す（email は PII のため除外）。 */
export default defineEventHandler<Promise<CurrentUserProfile>>(async (event) => {
  const userId = await serverUserId(event)
  const client = await serverSupabaseClient(event)

  // email は返さない（PII）。UI でも未使用。
  const { data, error } = await client
    .from('profiles')
    .select('id, employee_id, name, role, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, 'api/users/me GET')
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'プロフィールが見つかりません' })
  }

  return data
})
