import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { resetPasswordSchema } from '#shared/types/schemas'

/**
 * POST /api/auth/reset-password
 * パスワードリセット用の認証コード（6桁 OTP）をメール送信する。
 * リンクは使わない（Supabase の recovery メールテンプレを `{{ .Token }}` 表示に設定すること）。
 * コードの検証＋新パスワード反映は /api/auth/reset-password-otp（verifyOtp）で行う。
 *
 * 未登録メールは 404 を返す（コードが届かず詰まる UX を避けるため、登録有無を明示する）。
 * ※ これはユーザー列挙を許す代わりに UX を優先した判断。社内・招待制ツール前提で、
 *   乱用は config.toml の送信レート制限で抑制する。
 */
export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, resetPasswordSchema)

  // 登録有無を service role で確認する（profiles.email は authenticated に非公開だが
  // service role は参照可。email は auth.users と同期済み）。
  const serviceClient = serverSupabaseServiceRole(event)
  const { data: existing } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'このメールアドレスは登録されていません' })
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.resetPasswordForEmail(email)

  if (error) {
    throw createError({ statusCode: 500, message: 'メールの送信に失敗しました' })
  }

  setResponseStatus(event, 204)
  return null
})
