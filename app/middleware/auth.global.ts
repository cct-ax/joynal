import type { Profile } from '#shared/types/models'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin') return

  const user = useSupabaseUser()
  if (!user.value) return

  try {
    const profile = await $fetch<Profile>('/api/users/me')
    if (profile?.role !== 'admin') {
      return navigateTo('/report')
    }
  } catch {
    return navigateTo('/report')
  }
})
