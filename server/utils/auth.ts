import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

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

/**
 * 認証済みかつ管理者ロールであることを確認し、その userId を返す。
 * 未認証なら 401、管理者以外なら 403 を throw する。
 *
 * profiles_select は USING(true) のため一覧取得等はハンドラ側で明示的に制限する必要がある。
 * role は authenticated でも参照可能なので、ここではユーザークライアントで確認する。
 */
export const assertAdminRole = async (event: H3Event): Promise<string> => {
  const userId = await serverUserId(event)
  const client = await serverSupabaseClient(event)
  const { data: caller } = await client.from('profiles').select('role').eq('id', userId).single()
  if (caller?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }
  return userId
}
