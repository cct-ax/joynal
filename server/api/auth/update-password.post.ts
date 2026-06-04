import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { UpdatePasswordResponse } from '#shared/types/api'
import { updatePasswordBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<UpdatePasswordResponse>>(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const body = await readBody<unknown>(event)
  const result = updatePasswordBodySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: '新しいパスワードは8文字以上で入力してください'
    })
  }

  const { error } = await client.auth.updateUser({ password: result.data.password })

  if (error) {
    console.error('[api/auth/update-password POST]', error)
    throw createError({ statusCode: 400, message: 'パスワードの変更に失敗しました' })
  }

  return { success: true }
})
