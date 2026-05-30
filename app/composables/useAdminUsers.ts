import type { Profile } from '#shared/types/models'
import type { UserCreateBody, UserUpdateBody } from '#shared/types/api'
import { reuseAsyncData } from '~/utils/asyncDataCache'

/**
 * 管理者用ユーザー一覧と CRUD 操作を提供する composable。
 *
 * - `GET /api/users` を keyed useAsyncData('admin-users') で取得する。
 * - server: false — 管理者ロール確認後にクライアントで取得する（SSR では認可前に空を掴む可能性）。
 * - 各ミューテーションは成功後に refresh() を呼んで一覧を最新化する。
 * - エラーは useApiError().notify で toast 表示し、成功フラグを戻り値で示す（モーダル close 判定用）。
 */
export const useAdminUsers = (): {
  users: Ref<Profile[]>
  pending: Ref<boolean>
  refresh: () => Promise<void>
  create: (body: UserCreateBody) => Promise<boolean>
  update: (id: string, body: UserUpdateBody) => Promise<boolean>
  setActive: (id: string, isActive: boolean) => Promise<boolean>
} => {
  const requestFetch = useRequestFetch()
  const apiError = useApiError()

  const { data, pending, refresh } = useAsyncData<Profile[]>(
    'admin-users',
    () => requestFetch<Profile[]>('/api/users'),
    // getCachedData でナビ間はキャッシュ再利用（/admin に戻る度に /api/users を叩かない）。
    // 各ミューテーションは refresh() で明示再取得するため最新性は保たれる。
    { default: () => [], server: false, getCachedData: reuseAsyncData }
  )

  /**
   * ユーザーを新規作成（招待）する。
   * 409（メール重複）は専用メッセージを表示。
   * 成功時は true、失敗時は false を返す。
   */
  const create = async (body: UserCreateBody): Promise<boolean> => {
    try {
      await $fetch<Profile>('/api/users', { method: 'POST', body })
      await refresh()
      return true
    } catch (error: unknown) {
      apiError.notify(error, {
        statusMessages: { 409: 'このメールアドレスは既に登録されています' },
        fallback: 'ユーザーの追加に失敗しました'
      })
      return false
    }
  }

  /**
   * ユーザー情報を更新する。
   * 成功時は true、失敗時は false を返す。
   */
  const update = async (id: string, body: UserUpdateBody): Promise<boolean> => {
    try {
      await $fetch<Profile>(`/api/users/${id}`, { method: 'PUT', body })
      await refresh()
      return true
    } catch (error: unknown) {
      apiError.notify(error, {
        fallback: 'ユーザー情報の更新に失敗しました'
      })
      return false
    }
  }

  /**
   * ユーザーの有効・無効を切り替える。
   * 成功時は true、失敗時は false を返す。
   */
  const setActive = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      await $fetch<Profile>(`/api/users/${id}`, { method: 'PUT', body: { is_active: isActive } })
      await refresh()
      return true
    } catch (error: unknown) {
      apiError.notify(error, {
        fallback: isActive ? 'ユーザーの有効化に失敗しました' : 'ユーザーの無効化に失敗しました'
      })
      return false
    }
  }

  return { users: data, pending, refresh, create, update, setActive }
}
