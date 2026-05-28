import { VALID_ROLES, type CurrentUserProfile, type UserRole } from '#shared/types/api'
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
  const requestFetch = useRequestFetch()

  // 共有キー 'current-user' の useAsyncData で重複排除する。複数コンポーネント
  // （AppHeader / レイアウト / ページ）から呼んでも /api/users/me の取得は 1 回に集約される。
  // SSR でも取得できるよう useRequestFetch でリクエストの Cookie を転送する。
  // useSupabaseUser() は getClaims() の JWT claims（ユーザー ID は `sub`）。未ログイン時は取得しない。
  const { data: profile, pending, error } = useAsyncData<CurrentUserProfile | null>(
    'current-user',
    async () => (user.value?.sub ? await requestFetch<CurrentUserProfile>('/api/users/me') : null),
    { watch: [user] }
  )

  // 404 = auth ユーザーに profiles 行が無い（招待フロー未経由）。UI で明示する。
  const profileMissing = computed(() => getFetchStatus(error.value) === 404)

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
