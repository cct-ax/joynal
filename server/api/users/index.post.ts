import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile } from '#shared/types/models'
import { userCreateBodySchema } from '#shared/types/schemas'

export default defineEventHandler<Promise<Profile>>(async (event) => {
  const userId = await serverUserId(event)

  const { name, employee_id, email, role } = await parseBody(event, userCreateBodySchema)

  const client = await serverSupabaseClient(event)
  const { data: callerProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const serviceClient = serverSupabaseServiceRole(event)
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true
  })

  if (authError) {
    if (authError.status === 422) {
      throw createError({ statusCode: 409, message: '同じメールアドレスが既に存在します' })
    }
    console.error('[api/users POST] auth.admin.createUser', authError)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  // email を含む行を返すため service role で挿入する（email は authenticated に非公開）
  const { data, error } = await serviceClient
    .from('profiles')
    .insert({ id: authUser.user.id, name, email, role, employee_id })
    .select()
    .single()

  if (error) {
    await serviceClient.auth.admin.deleteUser(authUser.user.id)
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { message: 'この社員IDは既に使用されています', code: 'EMPLOYEE_ID_TAKEN' }
      })
    }
    console.error('[api/users POST] profile insert', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  // 招待メール: 初期パスワード設定のため recovery OTP を送る（リンク不使用・/reset-password で設定）。
  // 送信失敗で作成自体は失敗させない（ユーザーは作成済み。本人は「パスワードをお忘れの方」で再送可）。
  const { error: inviteError } = await client.auth.resetPasswordForEmail(email)
  if (inviteError) {
    console.error('[api/users POST] resetPasswordForEmail', inviteError)
  }

  setResponseStatus(event, 201)
  return data
})
