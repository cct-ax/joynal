import { serverSupabaseClient } from '#supabase/server'
import { resetPasswordSchema } from '#shared/types/schemas'

/**
 * POST /api/auth/reset-password
 * パスワードリセット用の認証コード（6桁 OTP）をメール送信する。
 * リンクは使わない（Supabase の recovery メールテンプレを `{{ .Token }}` 表示に設定すること）。
 * コードの検証＋新パスワード反映は /api/auth/reset-password-otp（verifyOtp）で行う。
 * メール存在の列挙を防ぐため、未登録メールでも Supabase は成功扱いになる。
 */
export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, resetPasswordSchema)

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.resetPasswordForEmail(email)

  if (error) {
    throw createError({ statusCode: 500, message: 'メールの送信に失敗しました' })
  }

  setResponseStatus(event, 204)
  return null
})
