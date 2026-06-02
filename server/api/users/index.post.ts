import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile } from '#shared/types/models'
import { userCreateBodySchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    summary: 'ユーザー招待',
    description: '管理者のみ。service role で Supabase Auth にユーザーを作成し profiles に挿入する。employee_id は手入力（自動採番なし）。作成後に初期パスワード設定用の recovery OTP メールを送る（送信失敗でも作成は成功扱い）。email 重複・employee_id 重複はいずれも 409（employee_id 重複は code: EMPLOYEE_ID_TAKEN）。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'employee_id', 'email', 'role'],
            properties: {
              name: { type: 'string' },
              employee_id: { type: 'string', description: '社員ID（自由形式・一意・最大50文字）' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['trainee', 'mentor', 'ojt', 'admin'] }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: '作成された profiles レコード',
        content: {
          'application/json': {
            example: {
              id: 'uuid',
              employee_id: 'E001',
              name: '新しい 社員',
              email: 'new@example.com',
              role: 'trainee',
              is_active: true,
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z'
            }
          }
        }
      },
      400: { description: '必須項目不足 / 不正な role' },
      401: { description: '未ログイン' },
      403: { description: '管理者以外が呼び出した' },
      409: { description: '同じメールアドレス、または同じ社員 ID が既に存在する（code: EMPLOYEE_ID_TAKEN）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * POST /api/users — ユーザーを招待作成し 201 を返す（管理者のみ）。
 * auth.users を service role で先行作成後に profiles を挿入し、recovery OTP メールを送付する（送信失敗は非致命的）。
 */
export default defineEventHandler<Promise<Profile>>(async (event) => {
  const userId = await serverUserId(event)

  const { name, employee_id, email, role } = await parseBody(event, userCreateBodySchema)

  const client = await serverSupabaseClient(event)
  const { data: callerProfile } = await client.from('profiles').select('role').eq('id', userId).single()

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
    throwSupabaseError(error, 'api/users POST profile insert', {
      23505: {
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { message: 'この社員IDは既に使用されています', code: 'EMPLOYEE_ID_TAKEN' }
      }
    })
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
