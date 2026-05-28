import { serverSupabaseClient } from '#supabase/server'
import { loginSchema } from '#shared/types/schemas'

/**
 * POST /api/auth/login
 * 認証情報をサーバー側で受け取り signInWithPassword を実行する。
 * @supabase/ssr の cookie アダプタ経由でセッション cookie を Set-Cookie で発行するため、
 * app/ 側は Supabase を直接呼ばずにログインできる。
 */
export default defineEventHandler(async (event) => {
  const { email, password } = await parseBody(event, loginSchema)

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw createError({ statusCode: 401, message: 'メールアドレスまたはパスワードが正しくありません' })
  }

  setResponseStatus(event, 204)
  return null
})
