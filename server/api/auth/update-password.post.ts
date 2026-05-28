import { serverSupabaseClient } from '#supabase/server'
import { updatePasswordBodySchema } from '#shared/types/schemas'

/**
 * POST /api/auth/update-password
 * ログイン中ユーザーのパスワードを更新する。
 */
export default defineEventHandler(async (event) => {
  await serverUserId(event)

  const { password } = await parseBody(event, updatePasswordBodySchema)

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.updateUser({ password })

  if (error) {
    throw createError({ statusCode: 400, message: 'パスワードの変更に失敗しました' })
  }

  setResponseStatus(event, 204)
  return null
})
