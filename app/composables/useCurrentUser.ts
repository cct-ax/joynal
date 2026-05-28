import type { Profile } from '#shared/types/models'
import { VALID_ROLES, type UserRole } from '#shared/types/api'

/**
 * profile.role が UserRole の値域に収まっているかを判定する type guard。
 * DB の CHECK 制約上は trainee/mentor/ojt/admin の 4 値だが、
 * TS 側の Profile.role は string のため、ここで明示的に絞り込む。
 */
const isUserRole = (v: string | null | undefined): v is UserRole =>
  v !== null && v !== undefined && (VALID_ROLES as readonly string[]).includes(v)

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

  const role = computed<UserRole | null>(() => {
    const raw = profile.value?.role
    return isUserRole(raw) ? raw : null
  })
  const isAdmin = computed(() => role.value === 'admin')
  const isMentor = computed(() => role.value === 'mentor')
  const isOjt = computed(() => role.value === 'ojt')
  const isTrainee = computed(() => role.value === 'trainee')

  return { profile, pending, role, isAdmin, isMentor, isOjt, isTrainee }
}
