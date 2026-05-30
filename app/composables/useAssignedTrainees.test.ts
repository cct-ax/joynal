import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { AssignmentForAdmin, AssignmentForMentor, UserRole } from '#shared/types/api'
import { useAssignedTrainees } from './useAssignedTrainees'

// useCurrentUser はロールだけ使うので、role ref を差し替えられるよう mock する。
const roleRef = ref<UserRole | null>(null)
mockNuxtImport('useCurrentUser', () => () => ({ role: roleRef }))

// useRequestFetch が返す fetch を spy 化して呼び出し内容を検証する。
const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const mentorAssignments: AssignmentForMentor[] = [
  { trainee_id: 't1', year: 2026, trainee: { name: '新人A', employee_id: 'E001' } },
  { trainee_id: 't2', year: 2026, trainee: { name: '新人B', employee_id: 'E002' } }
]

const adminAssignments: AssignmentForAdmin[] = [
  {
    trainee_id: 't9',
    mentor_id: 'm1',
    ojt_id: null,
    year: 2026,
    trainee: { name: '新人Z' },
    mentor: { name: 'メンター1' },
    ojt: null
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

  it('admin は AssignmentForAdmin を正規化するが選択は null のまま', async () => {
    roleRef.value = 'admin'
    requestFetchMock.mockResolvedValue(adminAssignments)

    const { traineeOptions, selectedTraineeId } = await mountTrainees()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/assignments/me')
    expect(traineeOptions.value).toEqual([{ id: 't9', name: '新人Z' }])
    expect(selectedTraineeId.value).toBeNull()
  })
})
