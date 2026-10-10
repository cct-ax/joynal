import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { AssignmentForMentor, UserRole } from '#shared/types/api'
import type { Profile } from '#shared/types/models'
import { useAssignedTrainees } from './useAssignedTrainees'

// useCurrentUser はロールだけ使うので、role ref を差し替えられるよう mock する。
const roleRef = ref<UserRole | null>(null)
mockNuxtImport('useCurrentUser', () => () => ({ role: roleRef }))

// useRequestFetch が返す fetch を spy 化して呼び出し内容を検証する。
// admin は /api/users を、mentor/ojt は /api/assignments/me を叩くため URL で分岐できるよう実装する。
const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const mentorAssignments: AssignmentForMentor[] = [
  { trainee_id: 't1', year: 2026, trainee: { name: '新人A', employee_id: 'E001' } },
  { trainee_id: 't2', year: 2026, trainee: { name: '新人B', employee_id: 'E002' } }
]

// admin テスト用: ロール混在のユーザー一覧（trainee 以外はフィルタされる）
const mixedUsers: Profile[] = [
  {
    id: 'u1',
    name: '新人X',
    role: 'trainee',
    email: 'x@example.com',
    employee_id: 'E010',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'u2',
    name: 'メンターY',
    role: 'mentor',
    email: 'y@example.com',
    employee_id: 'E011',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'u3',
    name: '新人Z',
    role: 'trainee',
    email: 'z@example.com',
    employee_id: 'E012',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
]

// 戻り値を component の setup 経由で取り出すための harness。
// keyed useAsyncData の重複排除を避けるため、テスト間で harness を unmount する。
let wrapper: VueWrapper | null = null

const mountTrainees = async () => {
  let exposed: ReturnType<typeof useAssignedTrainees> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useAssignedTrainees()
        return () => h('div')
      }
    })
  )
  // exposed は setup クロージャ内で代入されるため flow narrowing が効かない。
  // 実行時の null チェックを残しつつ、戻り型を明示キャストで絞る。
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useAssignedTrainees>
}

describe('useAssignedTrainees', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    roleRef.value = null
    clearNuxtData('assignments-me')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('assignments-me')
  })

  it('trainee ロールでは API を叩かず空配列・選択 null', async () => {
    roleRef.value = 'trainee'
    requestFetchMock.mockResolvedValue(mentorAssignments)

    const { traineeOptions, selectedTraineeId } = await mountTrainees()

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(traineeOptions.value).toEqual([])
    expect(selectedTraineeId.value).toBeNull()
  })

  it('role が null では API を叩かない', async () => {
    roleRef.value = null
    requestFetchMock.mockResolvedValue(mentorAssignments)

    const { traineeOptions } = await mountTrainees()

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(traineeOptions.value).toEqual([])
  })

  it('mentor は /api/assignments/me を叩き trainee を正規化、先頭を初期選択', async () => {
    roleRef.value = 'mentor'
    requestFetchMock.mockResolvedValue(mentorAssignments)

    const { traineeOptions, selectedTraineeId } = await mountTrainees()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/assignments/me')
    expect(traineeOptions.value).toEqual([
      { id: 't1', name: '新人A' },
      { id: 't2', name: '新人B' }
    ])
    expect(selectedTraineeId.value).toBe('t1')
  })

  it('ojt も先頭の新人を初期選択する', async () => {
    roleRef.value = 'ojt'
    requestFetchMock.mockResolvedValue(mentorAssignments)

    const { selectedTraineeId } = await mountTrainees()

    expect(selectedTraineeId.value).toBe('t1')
  })

  it('admin は /api/users を叩き trainee のみ正規化、選択は null のまま', async () => {
    roleRef.value = 'admin'
    requestFetchMock.mockResolvedValue(mixedUsers)

    const { traineeOptions, selectedTraineeId } = await mountTrainees()

    // /api/users を叩く（/api/assignments/me ではない）
    expect(requestFetchMock).toHaveBeenCalledWith('/api/users')
    // mentor は除外され trainee だけが残る
    expect(traineeOptions.value).toEqual([
      { id: 'u1', name: '新人X' },
      { id: 'u3', name: '新人Z' }
    ])
    // admin は明示選択を促すため初期選択しない
    expect(selectedTraineeId.value).toBeNull()
  })
})
