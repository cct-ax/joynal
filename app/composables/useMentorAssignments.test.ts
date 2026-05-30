import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { AssignmentForAdmin, AssignmentUpsertBody } from '#shared/types/api'
import type { Profile, MentorAssignment } from '#shared/types/models'
import { useMentorAssignments } from './useMentorAssignments'

// ----------------------------------------------------------------
// モック設定
// ----------------------------------------------------------------

const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const apiErrorNotifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: apiErrorNotifyMock }))

// $fetch はグローバルに spy 化する（vi.stubGlobal 経由）
const fetchMock = vi.fn()

// ----------------------------------------------------------------
// テストデータ
// ----------------------------------------------------------------

/** アクティブなメンター */
const mentorUser: Profile = {
  id: 'mentor-1',
  employee_id: 'M001',
  name: 'メンター太郎',
  email: 'mentor@example.com',
  role: 'mentor',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

/** アクティブな OJT */
const ojtUser: Profile = {
  id: 'ojt-1',
  employee_id: 'O001',
  name: 'OJT 花子',
  email: 'ojt@example.com',
  role: 'ojt',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

/** 割り当て済み trainee */
const traineeA: Profile = {
  id: 'trainee-a',
  employee_id: 'T001',
  name: '新人A',
  email: 'a@example.com',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

/** 未割り当て trainee */
const traineeB: Profile = {
  id: 'trainee-b',
  employee_id: 'T002',
  name: '新人B',
  email: 'b@example.com',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

/** 非アクティブ trainee（rows に含まれないこと） */
const traineeInactive: Profile = {
  id: 'trainee-inactive',
  employee_id: 'T003',
  name: '非アクティブ',
  email: 'inactive@example.com',
  role: 'trainee',
  is_active: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

const allUsers: Profile[] = [mentorUser, ojtUser, traineeA, traineeB, traineeInactive]

/** traineeA の割り当て（mentorId あり / ojtId なし） */
const assignmentA: AssignmentForAdmin = {
  trainee_id: 'trainee-a',
  mentor_id: 'mentor-1',
  ojt_id: null,
  year: 2026,
  trainee: { name: '新人A' },
  mentor: { name: 'メンター太郎' },
  ojt: null
}

// traineeB は assignments に存在しない（未割り当て）

// ----------------------------------------------------------------
// Harness
// ----------------------------------------------------------------

let wrapper: VueWrapper | null = null

const mountComposable = async (): Promise<ReturnType<typeof useMentorAssignments>> => {
  let exposed: ReturnType<typeof useMentorAssignments> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useMentorAssignments()
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useMentorAssignments>
}

// ----------------------------------------------------------------
// テスト
// ----------------------------------------------------------------

describe('useMentorAssignments', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    toastAddMock.mockReset()
    apiErrorNotifyMock.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)

    clearNuxtData('admin-users')
    clearNuxtData('admin-assignments')

    // デフォルトのリクエストモック設定
    requestFetchMock.mockImplementation((url: string) => {
      if (url === '/api/users') return Promise.resolve(allUsers)
      if (url === '/api/assignments/me') return Promise.resolve([assignmentA])
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('admin-users')
    clearNuxtData('admin-assignments')
  })

  // ----------------------------------------------------------------
  // マージ（未割り当て trainee の処理）
  // ----------------------------------------------------------------

  it('未割り当て trainee は mentorId/ojtId が null でマージされる', async () => {
    const { rows } = await mountComposable()

    const rowB = rows.value.find(r => r.traineeId === 'trainee-b')
    expect(rowB).toBeDefined()
    expect(rowB?.traineeName).toBe('新人B')
    expect(rowB?.mentorId).toBeNull()
    expect(rowB?.ojtId).toBeNull()
  })

  it('割り当て済み trainee は mentorId/ojtId が反映される', async () => {
    const { rows } = await mountComposable()

    const rowA = rows.value.find(r => r.traineeId === 'trainee-a')
    expect(rowA?.mentorId).toBe('mentor-1')
    expect(rowA?.ojtId).toBeNull()
  })

  it('非アクティブ trainee は rows に含まれない', async () => {
    const { rows } = await mountComposable()

    const inactive = rows.value.find(r => r.traineeId === 'trainee-inactive')
    expect(inactive).toBeUndefined()
  })

  it('全 active trainee が rows に含まれる', async () => {
    const { rows } = await mountComposable()

    expect(rows.value).toHaveLength(2)
    expect(rows.value.map(r => r.traineeId)).toContain('trainee-a')
    expect(rows.value.map(r => r.traineeId)).toContain('trainee-b')
  })

  // ----------------------------------------------------------------
  // オプションリスト
  // ----------------------------------------------------------------

  it('mentorOptions はアクティブな mentor のみを含む', async () => {
    const { mentorOptions } = await mountComposable()

    expect(mentorOptions.value).toEqual([{ id: 'mentor-1', name: 'メンター太郎' }])
  })

  it('ojtOptions はアクティブな ojt のみを含む', async () => {
    const { ojtOptions } = await mountComposable()

    expect(ojtOptions.value).toEqual([{ id: 'ojt-1', name: 'OJT 花子' }])
  })

  // ----------------------------------------------------------------
  // isDirty
  // ----------------------------------------------------------------

  it('初期状態では isDirty は false', async () => {
    const { isDirty } = await mountComposable()

    expect(isDirty.value).toBe(false)
  })

  it('setMentorId で変更すると isDirty が true になる', async () => {
    const { isDirty, setMentorId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    await nextTick()

    expect(isDirty.value).toBe(true)
  })

  it('変更後に元の値に戻すと isDirty が false になる', async () => {
    const { isDirty, setMentorId } = await mountComposable()

    setMentorId('trainee-a', null) // mentor-1 → null（変更）
    await nextTick()
    expect(isDirty.value).toBe(true)

    setMentorId('trainee-a', 'mentor-1') // null → mentor-1（元に戻す）
    await nextTick()
    expect(isDirty.value).toBe(false)
  })

  it('setMentorId で変更すると rows に反映される', async () => {
    const { rows, setMentorId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    await nextTick()

    const rowB = rows.value.find(r => r.traineeId === 'trainee-b')
    expect(rowB?.mentorId).toBe('mentor-1')
  })

  it('setOjtId で変更すると rows に反映される', async () => {
    const { rows, setOjtId } = await mountComposable()

    setOjtId('trainee-a', 'ojt-1')
    await nextTick()

    const rowA = rows.value.find(r => r.traineeId === 'trainee-a')
    expect(rowA?.ojtId).toBe('ojt-1')
  })

  it('割り当て済みメンターを未割り当て(null)にすると rows に null が反映される', async () => {
    // 回帰テスト: rows が `?? canonical` で null 編集を握り潰さないこと
    const { rows, setMentorId } = await mountComposable()

    setMentorId('trainee-a', null) // mentor-1 → 未割り当て
    await nextTick()

    const rowA = rows.value.find(r => r.traineeId === 'trainee-a')
    expect(rowA?.mentorId).toBeNull()
  })

  // ----------------------------------------------------------------
  // save()
  // ----------------------------------------------------------------

  it('変更がない場合は save() で PUT を叩かない', async () => {
    const { save } = await mountComposable()

    await save()
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('変更のある trainee だけ PUT /api/assignments を呼ぶ', async () => {
    fetchMock.mockResolvedValue({
      id: 'assignment-b',
      trainee_id: 'trainee-b',
      mentor_id: 'mentor-1',
      ojt_id: null,
      year: 2026,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    } satisfies MentorAssignment)

    const { save, setMentorId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    await nextTick()

    await save()
    await flushPromises()

    // trainee-a は変更なし → PUT されない
    // trainee-b だけ PUT
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/assignments', {
      method: 'PUT',
      body: {
        traineeId: 'trainee-b',
        mentorId: 'mentor-1',
        ojtId: null
      } satisfies Omit<AssignmentUpsertBody, 'year'>
    })
  })

  it('保存成功でトースト「割り当てを保存しました」が表示される', async () => {
    fetchMock.mockResolvedValue({} as MentorAssignment)

    const { save, setMentorId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    await nextTick()
    await save()
    await flushPromises()

    expect(toastAddMock).toHaveBeenCalledWith({
      title: '割り当てを保存しました',
      color: 'success'
    })
  })

  it('複数の変更がある場合は全て PUT を送る', async () => {
    fetchMock.mockResolvedValue({} as MentorAssignment)

    const { save, setMentorId, setOjtId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    setOjtId('trainee-a', 'ojt-1')
    await nextTick()
    await save()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('PUT 失敗時は apiError.notify を呼び toast を出さない', async () => {
    const error = new Error('network error')
    fetchMock.mockRejectedValue(error)

    const { save, setMentorId } = await mountComposable()

    setMentorId('trainee-b', 'mentor-1')
    await nextTick()
    await save()
    await flushPromises()

    expect(apiErrorNotifyMock).toHaveBeenCalledWith(error, {
      fallback: '割り当ての保存に失敗しました'
    })
    expect(toastAddMock).not.toHaveBeenCalled()
  })
})
