import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * 認証済みユーザーの ID（auth.users.id）を返す。未認証なら 401 を throw する。
 *
 * NOTE: @nuxtjs/supabase 2.x の `serverSupabaseUser` は `getClaims()` の JwtPayload を返すため、
 * ユーザー ID は `user.id` ではなく JWT の `sub` に入る。ハンドラーで直接 `user.id` を参照すると
 * undefined になり、RLS の `user_id = auth.uid()` 等が必ず失敗する（42501 → 403）。
 * その差異をここで吸収し、常に string の ID を返す。
 */
export const serverUserId = async (event: H3Event): Promise<string> => {
  const claims = await serverSupabaseUser(event)
  const userId = claims?.sub
  if (!userId) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }
  return userId
}
