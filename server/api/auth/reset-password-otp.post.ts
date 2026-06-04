import { serverSupabaseClient } from '#supabase/server'
import { resetPasswordOtpBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['auth'],
    summary: 'コード検証＋新パスワード設定',
    description:
      'verifyOtp(type=recovery) → updateUser(password) を実行し、最後に全セッションを失効させる。コードが不正・期限切れ、または更新失敗時は 400。新パスワードが現在と同一なら 422（code: SAME_PASSWORD）。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'token', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              token: { type: 'string', description: '確認コード（6〜8桁の数字）' },
              password: { type: 'string', description: '新パスワード（8文字以上）' }
            }
          }
        }
      }
    },
    responses: {
      204: { description: '成功（ボディなし・全セッション失効）' },
      400: { description: 'コードが不正・期限切れ / 更新失敗' },
      422: { description: '新パスワードが現在と同一（code: SAME_PASSWORD）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

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
    // verifyOtp 成功で確立した recovery セッションを残さないよう失効させる（更新失敗で離脱しても
    // 認証済み状態を残さない）。OTP は verify 成功時点で消費済みのため、再試行にはコード再送が必要。
    await client.auth.signOut()
    // 新パスワードが現在のパスワードと同一だと Supabase は 422 same_password を返す。
    // これは「コードが不正」ではないので 400 と区別し、専用コードで理由を明示する。
    if (updateError.code === 'same_password') {
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Entity',
        data: {
          message: '新しいパスワードは現在のパスワードと異なるものを設定してください',
          code: 'SAME_PASSWORD'
        }
      })
    }
    console.error('[api/auth/reset-password-otp] updateUser', updateError)
    throw createError({ statusCode: 400, message: 'パスワードの更新に失敗しました' })
  }

  // セキュリティ: 旧セッションを含め全セッションを失効させ、再ログインを促す
  await client.auth.signOut()

  setResponseStatus(event, 204)
  return null
})
