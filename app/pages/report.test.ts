import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { CurrentUserProfile, PersonOption, UserRole } from '#shared/types/api'
import Report from './report.vue'

// ---- useCurrentUser のモック（ロール・profile・pending を差し替える）----
const role = ref<UserRole | null>('trainee')
const profile = ref<CurrentUserProfile | null>(null)
const profilePending = ref(false)
mockNuxtImport('useCurrentUser', () => () => ({
  role,
  profile,
  isAdmin: computed(() => role.value === 'admin'),
  isMentor: computed(() => role.value === 'mentor'),
  isOjt: computed(() => role.value === 'ojt'),
  pending: profilePending
}))

// ---- useWeekNavigation のモック（週ナビ状態。実日付ロジックは別テスト済み）----
const weekStart = new Date(2026, 4, 25) // 2026-05-25 (月)
mockNuxtImport('useWeekNavigation', () => () => ({
  currentWeekStart: ref(weekStart),
  weekDays: computed(() => Array.from({ length: 5 }, (_, i) => new Date(2026, 4, 25 + i))),
  weekStartYmd: computed(() => '2026-05-25')
}))

// ---- useAssignedTrainees のモック（セレクタの選択肢・選択状態）----
const traineeOptions = ref<PersonOption[]>([])
const selectedTraineeId = ref<string | null>(null)
const assigneesPending = ref(false)
mockNuxtImport('useAssignedTrainees', () => () => ({
  traineeOptions,
  selectedTraineeId,
  pending: assigneesPending
}))

// ---- useWeeklyReports のモック（取得状態。空の reportByDate）----
const reportsStatus = ref<'idle' | 'pending' | 'success' | 'error'>('success')
mockNuxtImport('useWeeklyReports', () => () => ({
  reportByDate: computed(() => ({})),
  refresh: () => Promise.resolve(),
  status: reportsStatus
}))

// ---- useWeeklyComments のモック（コメント無し）----
mockNuxtImport('useWeeklyComments', () => () => ({
  mentorComment: computed(() => null),
  ojtComment: computed(() => null),
  refresh: () => Promise.resolve()
}))

// ---- useMounted（@vueuse）：ハイドレーション後を既定にする ----
const mounted = ref(true)
mockNuxtImport('useMounted', () => () => mounted)

const sampleTrainee: PersonOption[] = [
  { id: 't1', name: '新人A' },
  { id: 't2', name: '新人B' }
]

describe('report ページ（ロール別の空状態 / スケルトン分岐）', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    // 既定: trainee・取得完了・マウント済み
    role.value = 'trainee'
    profile.value = { id: 'me', employee_id: 'E000', name: '自分', role: 'trainee', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
    profilePending.value = false
    traineeOptions.value = []
    selectedTraineeId.value = null
    assigneesPending.value = false
    reportsStatus.value = 'success'
    mounted.value = true
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('マウント前はスケルトン（role=status, aria-label=読み込み中…）を表示する', async () => {
    mounted.value = false
    wrapper = await mountSuspended(Report)
    expect(wrapper.find('[role="status"][aria-label="読み込み中…"]').exists()).toBe(true)
  })

  it('profile pending 中はスケルトンを表示する', async () => {
    profilePending.value = true
    wrapper = await mountSuspended(Report)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('reports が idle/pending の間はスケルトンを表示する', async () => {
    reportsStatus.value = 'pending'
    wrapper = await mountSuspended(Report)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('trainee は取得完了でスケルトンを出さず、空状態も出さない（テーブルを描画）', async () => {
    wrapper = await mountSuspended(Report)
    expect(wrapper.find('[role="status"][aria-label="読み込み中…"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('閲覧する新人を選択してください')
    expect(wrapper.text()).not.toContain('割り当てられていません')
    // 週ナビの曜日ヘッダーなどテーブルカードが描画される
    expect(wrapper.text()).toContain('やったこと')
  })

  it('mentor で担当 0 件のときは管理者連絡を促す空状態を表示する', async () => {
    role.value = 'mentor'
    traineeOptions.value = []
    selectedTraineeId.value = null
    wrapper = await mountSuspended(Report)
    expect(wrapper.text()).toContain('担当の新人がまだ割り当てられていません。管理者にお問い合わせください。')
  })

  it('admin で新人 0 件のときは「新人がまだ登録されていません」と管理画面 CTA を表示する', async () => {
    role.value = 'admin'
    traineeOptions.value = []
    selectedTraineeId.value = null
    wrapper = await mountSuspended(Report)
    expect(wrapper.text()).toContain('新人がまだ登録されていません')
    // CTA リンク（/admin へ）
    expect(wrapper.find('a[href="/admin"]').exists()).toBe(true)
  })

  it('admin で新人ありだが未選択のときは「閲覧する新人を選択してください」を表示する', async () => {
    role.value = 'admin'
    traineeOptions.value = sampleTrainee
    selectedTraineeId.value = null
    wrapper = await mountSuspended(Report)
    expect(wrapper.text()).toContain('閲覧する新人を選択してください')
    // セレクタ（対象:）は表示される
    expect(wrapper.text()).toContain('対象:')
  })

  it('mentor で新人を選択済みのときは空状態を出さずテーブルを描画する', async () => {
    role.value = 'mentor'
    traineeOptions.value = sampleTrainee
    selectedTraineeId.value = 't1'
    wrapper = await mountSuspended(Report)
    expect(wrapper.text()).not.toContain('閲覧する新人を選択してください')
    expect(wrapper.text()).not.toContain('割り当てられていません')
    expect(wrapper.text()).toContain('やったこと')
  })
})
