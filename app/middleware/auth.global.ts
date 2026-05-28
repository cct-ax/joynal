import type { Profile } from '#shared/types/models'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin') return

  const user = useSupabaseUser()
  if (!user.value?.sub) return

  // useCurrentUser と同じ共有キャッシュ（key: 'current-user'）を再利用し /api/users/me の重複取得を避ける。
  // 未取得時（/admin 直アクセス等）のみ Cookie 転送付きで 1 回だけ取得する。
  const cached = useNuxtData<Profile>('current-user')
  const requestFetch = useRequestFetch()

  let profile = cached.data.value
  if (!profile) {
    try {
      profile = await requestFetch<Profile>('/api/users/me')
    } catch {
      return navigateTo('/report')
    }
  }

  if (profile?.role !== 'admin') {
    return navigateTo('/report')
  }
})
