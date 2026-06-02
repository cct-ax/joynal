import { serverSupabaseClient } from '#supabase/server'
import { loginSchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['auth'],
    summary: 'ログイン',
    description:
      'メール / パスワードでログインする。成功時はセッション Cookie を Set-Cookie で返す。app からは supabase.auth を直接呼ばず必ずここ経由。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      204: { description: '成功（ボディなし・セッション Cookie を発行）' },
      400: { description: 'バリデーションエラー' },
      401: { description: 'メール / パスワード不一致' },
      500: { description: 'サーバーエラー' }
    }
  }
})

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
