import type { Profile } from '#shared/types/models'
import { VALID_ROLES, type UserRole } from '#shared/types/api'
import { getFetchStatus } from '~/utils/fetchError'

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
  const profileMissing = ref(false)

  watch(
    user,
    async (currentUser) => {
      // useSupabaseUser() は getClaims() の JWT claims を返すため、ユーザー ID は `sub` に入る
      // （`id` ではない）。ここを `id` にすると常に未認証扱いで早期 return し、/api/users/me を
      // 取得できず header が「ユーザー」のままになる。
      if (!currentUser?.sub) {
        profile.value = null
        profileMissing.value = false
        pending.value = false
        return
      }
      try {
        profile.value = await $fetch<Profile>('/api/users/me')
        profileMissing.value = false
      } catch (error: unknown) {
        profile.value = null
        // 404 = auth ユーザーに profiles 行が無い（招待フロー未経由）。UI で明示する。
        profileMissing.value = getFetchStatus(error) === 404
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

  return { profile, pending, profileMissing, role, isAdmin, isMentor, isOjt, isTrainee }
}
