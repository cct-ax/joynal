import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile } from '#shared/types/models'

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
    console.error('[api/users GET]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  return data
})
