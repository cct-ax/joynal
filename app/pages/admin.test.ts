import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { AssignmentRowVM, CurrentUserProfile, PersonOption } from '#shared/types/api'
import type { Profile } from '#shared/types/models'
import Admin from './admin.vue'

// ---- useCurrentUser（自分自身の id を UserTable に渡すため profile のみ使う）----
const currentUser = ref<CurrentUserProfile | null>(null)
mockNuxtImport('useCurrentUser', () => () => ({ profile: currentUser }))

// ---- useAdminUsers のモック（ユーザー一覧・pending）----
const users = ref<Profile[]>([])
const usersPending = ref(false)
mockNuxtImport('useAdminUsers', () => () => ({
  users,
  pending: usersPending,
  refresh: () => Promise.resolve(),
  setActive: () => Promise.resolve(true)
}))

// ---- useMentorAssignments のモック（割り当て行・pending）----
const rows = ref<AssignmentRowVM[]>([])
const assignPending = ref(false)
const isDirty = ref(false)
mockNuxtImport('useMentorAssignments', () => () => ({
  rows,
  mentorOptions: computed<PersonOption[]>(() => []),
  ojtOptions: computed<PersonOption[]>(() => []),
  isDirty,
  pending: assignPending,
  setMentorId: () => {},
  setOjtId: () => {},
  save: () => Promise.resolve()
}))

// ---- useMounted（@vueuse）：ハイドレーション後を既定にする ----
const mounted = ref(true)
mockNuxtImport('useMounted', () => () => mounted)

const sampleUsers: Profile[] = [
  {
    id: 'u1',
    employee_id: 'E001',
    name: '山田 太郎',
    email: 'taro@example.com',
    role: 'trainee',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'u2',
    employee_id: 'E002',
    name: '佐藤 花子',
    email: 'hanako@example.com',
    role: 'mentor',
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z'
  }
]

const sampleRows: AssignmentRowVM[] = [
  { traineeId: 'u1', traineeName: '山田 太郎', mentorId: null, ojtId: null }
]

describe('admin ページ（テーブル描画・空状態・スケルトン）', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    currentUser.value = { id: 'admin1', employee_id: 'E000', name: '管理者', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
    users.value = []
    usersPending.value = false
    rows.value = []
    assignPending.value = false
    isDirty.value = false
    mounted.value = true
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('ページ見出し「管理画面」とタブ（ユーザー管理 / 新人担当設定）を表示する', async () => {
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).toContain('管理画面')
    expect(wrapper.text()).toContain('ユーザー管理')
    expect(wrapper.text()).toContain('新人担当設定')
  })

  it('マウント前は stat chips をスケルトン表示する（実数を出さない）', async () => {
    mounted.value = false
    users.value = sampleUsers
    wrapper = await mountSuspended(Admin)
    // USkeleton のクラスを含む（stat chips のプレースホルダ）
    expect(wrapper.html()).toContain('rounded-lg')
    // 実カウント由来のラベルはまだ確定描画されない
    expect(wrapper.find('.tabular-nums').exists()).toBe(false)
  })

  it('users 取得済みでユーザー一覧（名前・社員 ID）を描画する', async () => {
    users.value = sampleUsers
    wrapper = await mountSuspended(Admin)
    const text = wrapper.text()
    expect(text).toContain('山田 太郎')
    expect(text).toContain('E001')
    expect(text).toContain('佐藤 花子')
  })

  it('users が空（取得完了）のとき UserTable は「ユーザーがいません」を表示する', async () => {
    users.value = []
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).toContain('ユーザーがいません')
  })

  it('stat chips に総ユーザー数・新人数・担当未設定数を出す', async () => {
    users.value = sampleUsers // trainee 1 + mentor 1
    rows.value = sampleRows // mentorId=null の新人 1 名 → 担当未設定 1
    wrapper = await mountSuspended(Admin)
    const nums = wrapper.findAll('.tabular-nums').map(n => n.text())
    // [ユーザー総数, 新人数, 担当未設定数]
    expect(nums).toEqual(['2', '1', '1'])
  })

  it('割り当て対象の新人がいないとき空状態を表示する', async () => {
    rows.value = []
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).toContain('割り当て対象の新人がいません')
  })

  it('割り当て行があるとき新人名と保存バーを描画する', async () => {
    rows.value = sampleRows
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).toContain('山田 太郎')
    // dirty 状態テキスト（既定 isDirty=false）
    expect(wrapper.text()).toContain('すべて保存済み')
    expect(wrapper.text()).not.toContain('割り当て対象の新人がいません')
  })

  it('isDirty のとき「未保存の変更があります」を表示する', async () => {
    rows.value = sampleRows
    isDirty.value = true
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).toContain('未保存の変更があります')
  })

  it('割り当て pending 中はスケルトンを表示し空状態/行は出さない', async () => {
    assignPending.value = true
    rows.value = []
    wrapper = await mountSuspended(Admin)
    expect(wrapper.text()).not.toContain('割り当て対象の新人がいません')
  })
})
