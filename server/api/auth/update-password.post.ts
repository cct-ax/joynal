import { serverSupabaseClient } from '#supabase/server'
import { updatePasswordBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['auth'],
    summary: 'ログイン中のパスワード変更',
    description: 'ヘッダーの「パスワード変更」から呼ぶ。新パスワードのみ受け取る（現在 / 確認用はフォーム UX 用でサーバーには送らない）。',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: {
        type: 'object',
        required: ['password'],
        properties: { password: { type: 'string', description: '新パスワード（8文字以上）' } }
      } } }
    },
    responses: {
      204: { description: '成功（ボディなし）' },
      400: { description: 'パスワード変更失敗 / バリデーションエラー' },
      401: { description: '未ログイン' },
      500: { description: 'サーバーエラー' }
    }
  }
})

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
