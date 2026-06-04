import { serverSupabaseClient } from '#supabase/server'
import type { CurrentUserProfile } from '#shared/types/api'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    summary: 'ログインユーザー自身のプロフィール取得',
    description: '全ログインユーザーが対象（useCurrentUser が内部で呼ぶ）。PII 保護のため email は返さない。招待のみで profiles 行が作られるため、行が無いユーザーは 404。',
    responses: {
      200: {
        description: '自身のプロフィール（email を除く）',
        content: {
          'application/json': {
            example: {
              id: 'uuid',
              employee_id: 'E001',
              name: '山田 太郎',
              role: 'trainee',
              is_active: true,
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z'
            }
          }
        }
      },
      401: { description: '未ログイン' },
      404: { description: 'プロフィールが存在しない（招待のみ作成のため行が無い）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/** GET /api/users/me — ログインユーザー自身のプロフィールを返す（email は PII のため除外）。 */
export default defineEventHandler<Promise<CurrentUserProfile>>(async (event) => {
  const userId = await serverUserId(event)
  const client = await serverSupabaseClient(event)

  // email は返さない（PII）。UI でも未使用。
  const { data, error } = await client
    .from('profiles')
    .select('id, employee_id, name, role, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, 'api/users/me GET')
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'プロフィールが見つかりません' })
  }

  return data
})
