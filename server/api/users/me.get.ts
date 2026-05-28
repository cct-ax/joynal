import { serverSupabaseClient } from '#supabase/server'
import type { Profile } from '#shared/types/models'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const userId = await serverUserId(event)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[api/users/me GET]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'プロフィールが見つかりません' })
  }

  return data
})
