import { serverSupabaseClient } from '#supabase/server'

/**
 * POST /api/auth/logout
 * サーバー側で signOut を実行しセッション cookie を破棄する。
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  await client.auth.signOut()

  setResponseStatus(event, 204)
  return null
})
