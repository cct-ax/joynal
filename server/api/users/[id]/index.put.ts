import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile, ProfileUpdate } from '#shared/types/models'
import { userUpdateBodySchema, uuidSchema } from '#shared/types/schemas'

// 実質的な永久 ban（Supabase は 'none' で解除、それ以外は PostgreSQL interval 文字列）
const BAN_DURATION_PERMANENT = '876000h'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    summary: 'ユーザー更新',
    description: '管理者のみ。変更したいフィールドのみ送る。is_active を false にすると Supabase Auth 側でも ban してログイン不可にする。email / 社員 ID の重複は 409。自己ロックアウト防止のため自分自身の権限降格・無効化は 400。',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              employee_id: { type: 'string', description: '社員ID（最大50文字）' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['trainee', 'mentor', 'ojt', 'admin'] },
              is_active: { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: '更新後の profiles レコード',
        content: {
          'application/json': {
            example: {
              id: 'uuid',
              employee_id: 'E002',
              name: '更新後の名前',
              email: 'updated@example.com',
              role: 'mentor',
              is_active: false,
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-02T00:00:00Z'
            }
          }
        }
      },
      400: { description: '不正な role / 自分自身の権限降格・無効化' },
      401: { description: '未ログイン' },
      403: { description: '管理者以外が呼び出した' },
      404: { description: '対象ユーザーが存在しない' },
      409: { description: '同じメール / 社員 ID が既に存在する（code: EMPLOYEE_ID_TAKEN）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * PUT /api/users/:id — ユーザー情報を更新する（管理者のみ）。
 * email 変更時は auth.users を先に更新して一意性を保証。is_active 変更時は ban_duration で GoTrue セッションを制御する。
 * 自己ロックアウト防止のため、管理者は自分自身の権限降格・無効化は不可。
 */
export default defineEventHandler<Promise<Profile>>(async (event) => {
  const userId = await serverUserId(event)

  const client = await serverSupabaseClient(event)
  const { data: callerProfile } = await client.from('profiles').select('role').eq('id', userId).single()

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  const id = parseRouteParam(event, 'id', uuidSchema)
  const { name, employee_id, email, role, is_active } = await parseBody(event, userUpdateBodySchema)

  // 自己ロックアウト防止: 管理者は自分自身の管理者権限を降格したり、自分を無効化したりできない。
  // （最後の管理者が締め出され、誰も管理操作できなくなる事態を防ぐ。他の admin が対象なら可。）
  if (id === userId) {
    if (role !== undefined && role !== 'admin') {
      throw createError({ statusCode: 400, message: '自分自身の管理者権限は変更できません' })
    }
    if (is_active === false) {
      throw createError({ statusCode: 400, message: '自分自身を無効化することはできません' })
    }
  }

  const updates: ProfileUpdate = {}
  if (name !== undefined) updates.name = name
  if (employee_id !== undefined) updates.employee_id = employee_id
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = is_active

  // email を含む行を返すため service role で更新する（email は authenticated に非公開）。
  // 認可は上の管理者ガードで担保済み。
  const serviceClient = serverSupabaseServiceRole(event)

  // email 変更時はログインの正である auth.users 側も同期する（profiles だけ更新すると
  // 旧アドレスでログインし続けてしまう）。profiles.email は UNIQUE 制約が無く auth.users のみが
  // email 一意性を強制するため、先に auth を更新し重複(422)で弾けば profiles を一切触らない。
  if (email !== undefined) {
    const { error: authEmailError } = await serviceClient.auth.admin.updateUserById(id, {
      email,
      email_confirm: true // 招待フローと同様、確認往復なしで即ログイン可能にする
    })
    if (authEmailError) {
      if (authEmailError.status === 422) {
        throw createError({ statusCode: 409, message: '同じメールアドレスが既に存在します' })
      }
      console.error('[api/users/:id PUT] auth.admin.updateUserById email', authEmailError)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }
  }

  const { data, error } = await serviceClient.from('profiles').update(updates).eq('id', id).select().single()

  if (error) {
    // employee_id の UNIQUE 衝突（社員ID重複）。email 一意性は上段の auth で担保済み。
    throwSupabaseError(error, 'api/users/:id PUT profile update', {
      PGRST116: { statusCode: 404, message: 'ユーザーが見つかりません' },
      23505: {
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { message: 'この社員IDは既に使用されています', code: 'EMPLOYEE_ID_TAKEN' }
      }
    })
  }

  if (is_active !== undefined) {
    const banDuration = is_active ? 'none' : BAN_DURATION_PERMANENT
    const { error: banError } = await serviceClient.auth.admin.updateUserById(id, { ban_duration: banDuration })
    if (banError) {
      console.error('[api/users/:id PUT] auth.admin.updateUserById', banError)
      throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }
  }

  return data
})
