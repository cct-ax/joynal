import { serverSupabaseClient } from '#supabase/server'
import { resetPasswordOtpBodySchema } from '#shared/types/schemas'

/**
 * POST /api/auth/reset-password-otp
 * メールで届いた6桁コード（recovery OTP）を検証し、新パスワードを設定する。
 *
 * - verifyOtp({ type: 'recovery' }) で recovery セッションを確立
 * - updateUser({ password }) で新パスワードを反映
 * - signOut()（既定 global）で全セッションを失効させる（セキュリティ: 旧セッションを残さない）
 *
 * リンク方式と違い redirect を一切使わないため、Redirect URLs 登録やオープンリダイレクト面が無い。
 */
export default defineEventHandler(async (event) => {
  const { email, token, password } = await parseBody(event, resetPasswordOtpBodySchema)

  const client = await serverSupabaseClient(event)

  const { error: verifyError } = await client.auth.verifyOtp({ email, token, type: 'recovery' })
  if (verifyError) {
    throw createError({ statusCode: 400, message: 'コードが正しくないか期限切れです。再度お試しください' })
  }

  const { error: updateError } = await client.auth.updateUser({ password })
  if (updateError) {
    throw createError({ statusCode: 400, message: 'パスワードの更新に失敗しました' })
  }

  // セキュリティ: 旧セッションを含め全セッションを失効させ、再ログインを促す
  await client.auth.signOut()

  setResponseStatus(event, 204)
  return null
})
