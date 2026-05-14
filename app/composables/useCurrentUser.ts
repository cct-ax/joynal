import type { Profile } from '#shared/types/models'
import type { UserRole } from '#shared/types/api'

export const useCurrentUser = () => {
  const user = useSupabaseUser()

  const profile = ref<Profile | null>(null)
  const pending = ref(true)

  watch(
    user,
    async (currentUser) => {
      if (!currentUser?.id) {
        profile.value = null
        pending.value = false
        return
      }
      try {
        profile.value = await $fetch<Profile>('/api/users/me')
      } catch {
        profile.value = null
      }
      pending.value = false
    },
    { immediate: true }
  )

  const role = computed(() => profile.value?.role as UserRole | null)
  const isAdmin = computed(() => role.value === 'admin')
  const isMentor = computed(() => role.value === 'mentor')
  const isOjt = computed(() => role.value === 'ojt')
  const isTrainee = computed(() => role.value === 'trainee')

  return { profile, pending, role, isAdmin, isMentor, isOjt, isTrainee }
}
