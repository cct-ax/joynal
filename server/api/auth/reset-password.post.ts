import { serverSupabaseClient } from '#supabase/server'
import { resetPasswordSchema } from '#shared/types/schemas'

/**
 * POST /api/auth/reset-password
 * パスワードリセットメールを送信する。
 * リダイレクト先はサーバーでリクエスト origin から導出する（クライアント入力を信用せず
 * オープンリダイレクトを防ぐ）。本番では NUXT_PUBLIC_SITE_URL 等の runtimeConfig 化も検討。
 */
export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, resetPasswordSchema)

  const redirectTo = new URL('/confirm', getRequestURL(event).origin).toString()

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    throw createError({ statusCode: 500, message: 'メールの送信に失敗しました' })
  }

  setResponseStatus(event, 204)
  return null
})
