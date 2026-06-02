import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile } from '#shared/types/models'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    summary: 'ユーザー一覧取得',
    description: '管理者のみ。email を含む全プロフィールを返す。',
    responses: {
      200: { description: 'ユーザー一覧', content: { 'application/json': { example: [{ id: 'uuid', employee_id: 'E001', name: '山田 太郎', email: 'yamada@example.com', role: 'trainee', is_active: true, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }] } } },
      401: { description: '未ログイン' },
      403: { description: '管理者以外が呼び出した' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * GET /api/users — 全ユーザーの一覧を返す（管理者のみ）。
 * email はカラム権限で authenticated に非公開のため、service role クライアントで取得する。
 */
export default defineEventHandler<Promise<Profile[]>>(async (event) => {
  const userId = await serverUserId(event)

  // 管理者ガード（profiles_select は USING(true) のため、一覧取得はここで明示的に制限する）。
  // role は authenticated でも参照可能なのでユーザークライアントで確認する。
  const client = await serverSupabaseClient(event)
  const { data: caller } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (caller?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  // email はカラム権限で authenticated に非公開のため、管理者向け一覧は service role で取得する。
  const serviceClient = serverSupabaseServiceRole(event)
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, employee_id, name, email, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, 'api/users GET')
  }

  return data
})
