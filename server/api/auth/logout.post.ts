import { serverSupabaseClient } from '#supabase/server'

defineRouteMeta({
  openAPI: {
    tags: ['auth'],
    summary: 'ログアウト',
    description: 'セッションを破棄する。リクエストボディは不要。',
    responses: {
      204: { description: '成功（ボディなし）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

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
