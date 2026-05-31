import { serverSupabaseClient } from '#supabase/server'
import { resetPasswordSchema } from '#shared/types/schemas'

/**
 * POST /api/auth/reset-password
 * パスワードリセットメールを送信する。
 * リダイレクト先はサーバー側で resolveSiteBaseUrl により決定し、クライアント入力を信用しない
 * （オープンリダイレクト防止）。NUXT_PUBLIC_SITE_URL があればその origin、無ければリクエスト origin。
 */
export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, resetPasswordSchema)

  const redirectTo = new URL('/confirm', resolveSiteBaseUrl(event)).toString()

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    throw createError({ statusCode: 500, message: 'メールの送信に失敗しました' })
  }

  setResponseStatus(event, 204)
  return null
})
