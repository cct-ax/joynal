import type { AssignmentForAdmin, AssignmentRowVM, PersonOption } from '#shared/types/api'
import type { Profile, MentorAssignment } from '#shared/types/models'

/**
 * 管理者向け担当割り当て composable。
 *
 * - `GET /api/users` で全ユーザーを取得し、role 別にオプションリストを生成する。
 * - `GET /api/assignments/me` で今年度の既存割り当て行を取得する（admin 呼び出しなので AssignmentForAdmin[]）。
 * - 全 trainee（is_active=true）をベースに assignments を突き合わせ、未割り当て trainee も含む
 *   canonical 行リストを生成する。
 * - ローカル編集用リアクティブ状態（editState）を canonical から初期化し、canonical 更新時に再同期する。
 * - `rows` は editState を読んで AssignmentRowVM[] を返す。
 * - `setMentorId` / `setOjtId` で特定 trainee の編集値を更新できる。
 * - `isDirty` は編集値が canonical と一差でも異なれば true。
 * - `save()` は変更のある trainee だけ `PUT /api/assignments` し、成功後に refresh する。
 *
 * ユーザー一覧は useAdminUsers と同じキー 'admin-users' で共有する（重複フェッチを避け、
 * ユーザー追加・更新で双方のタブが同時に最新化される）。割り当ては 'admin-assignments'。
 */

/** 編集状態の単行。traineeId をキーに editState Map で管理する */
type EditEntry = {
  mentorId: string | null
  ojtId: string | null
}

export const useMentorAssignments = (): {
  rows: ComputedRef<AssignmentRowVM[]>
  mentorOptions: ComputedRef<PersonOption[]>
  ojtOptions: ComputedRef<PersonOption[]>
  isDirty: ComputedRef<boolean>
  pending: ComputedRef<boolean>
  setMentorId: (traineeId: string, mentorId: string | null) => void
  setOjtId: (traineeId: string, ojtId: string | null) => void
  save: () => Promise<void>
} => {
  const requestFetch = useRequestFetch()
  const toast = useToast()
  const apiError = useApiError()

  // ----------------------------------------------------------------
  // データ取得
  // ----------------------------------------------------------------

  const {
    data: usersData,
    pending: usersPending,
    refresh: refreshUsers
  } = useAsyncData<Profile[]>(
    'admin-users',
    () => requestFetch<Profile[]>('/api/users'),
    { default: () => [], server: false }
  )

  const {
    data: assignmentsData,
    pending: assignmentsPending,
    refresh: refreshAssignments
  } = useAsyncData<AssignmentForAdmin[]>(
    'admin-assignments',
    () => requestFetch<AssignmentForAdmin[]>('/api/assignments/me'),
    { default: () => [], server: false }
  )

  // ----------------------------------------------------------------
  // オプションリスト（active ユーザーのみ）
  // ----------------------------------------------------------------

  const mentorOptions = computed<PersonOption[]>(() =>
    (usersData.value ?? [])
      .filter(u => u.role === 'mentor' && u.is_active)
      .map(u => ({ id: u.id, name: u.name }))
  )

  const ojtOptions = computed<PersonOption[]>(() =>
    (usersData.value ?? [])
      .filter(u => u.role === 'ojt' && u.is_active)
      .map(u => ({ id: u.id, name: u.name }))
  )

  // ----------------------------------------------------------------
  // Canonical 行リスト（サーバーの真の状態）
  // ----------------------------------------------------------------

  const canonicalRows = computed<AssignmentRowVM[]>(() => {
    const trainees = (usersData.value ?? []).filter(
      u => u.role === 'trainee' && u.is_active
    )
    const assignmentMap = new Map<string, AssignmentForAdmin>(
      (assignmentsData.value ?? []).map(a => [a.trainee_id, a])
    )
    return trainees.map((t) => {
      const a = assignmentMap.get(t.id)
      return {
        traineeId: t.id,
        traineeName: t.name,
        mentorId: a?.mentor_id ?? null,
        ojtId: a?.ojt_id ?? null
      }
    })
  })

  // ----------------------------------------------------------------
  // ローカル編集状態
  // ----------------------------------------------------------------

  // traineeId → { mentorId, ojtId } のマップ（reactive）
  const editState = reactive<Map<string, EditEntry>>(new Map())

  /** canonical 行から editState を（再）初期化する */
  const syncFromCanonical = (): void => {
    editState.clear()
    for (const row of canonicalRows.value) {
      editState.set(row.traineeId, { mentorId: row.mentorId, ojtId: row.ojtId })
    }
  }

  // データ再取得後に editState を再同期する
  watch(canonicalRows, () => {
    syncFromCanonical()
  })

  // ----------------------------------------------------------------
  // 公開 rows（editState から生成）
  // ----------------------------------------------------------------

  const rows = computed<AssignmentRowVM[]>(() =>
    canonicalRows.value.map((row) => {
      const edit = editState.get(row.traineeId)
      // editState は同期済みなら必ず行を持つ。edit.mentorId は null（明示的な未割り当て）も
      // 正しい値なので `??` で canonical にフォールバックしてはいけない（編集が消えてしまう）。
      return {
        traineeId: row.traineeId,
        traineeName: row.traineeName,
        mentorId: edit ? edit.mentorId : row.mentorId,
        ojtId: edit ? edit.ojtId : row.ojtId
      }
    })
  )

  // ----------------------------------------------------------------
  // 変更検知
  // ----------------------------------------------------------------

  const isDirty = computed<boolean>(() => {
    for (const canonical of canonicalRows.value) {
      const edit = editState.get(canonical.traineeId)
      if (!edit) continue
      if (edit.mentorId !== canonical.mentorId || edit.ojtId !== canonical.ojtId) {
        return true
      }
    }
    return false
  })

  // ----------------------------------------------------------------
  // 編集操作
  // ----------------------------------------------------------------

  const setMentorId = (traineeId: string, mentorId: string | null): void => {
    const current = editState.get(traineeId)
    if (current) {
      editState.set(traineeId, { ...current, mentorId })
    }
  }

  const setOjtId = (traineeId: string, ojtId: string | null): void => {
    const current = editState.get(traineeId)
    if (current) {
      editState.set(traineeId, { ...current, ojtId })
    }
  }

  // ----------------------------------------------------------------
  // 保存
  // ----------------------------------------------------------------

  /**
   * 変更のある trainee のみ PUT /api/assignments を並列実行し、成功後に refresh する。
   */
  const save = async (): Promise<void> => {
    const changed = canonicalRows.value.filter((canonical) => {
      const edit = editState.get(canonical.traineeId)
      if (!edit) return false
      return edit.mentorId !== canonical.mentorId || edit.ojtId !== canonical.ojtId
    })

    if (changed.length === 0) return

    try {
      await Promise.all(
        changed.map((canonical) => {
          const edit = editState.get(canonical.traineeId)
          return $fetch<MentorAssignment>('/api/assignments', {
            method: 'PUT',
            body: {
              traineeId: canonical.traineeId,
              mentorId: edit?.mentorId ?? null,
              ojtId: edit?.ojtId ?? null
            }
          })
        })
      )
    } catch (error: unknown) {
      apiError.notify(error, { fallback: '割り当ての保存に失敗しました' })
      return
    }

    toast.add({ title: '割り当てを保存しました', color: 'success' })

    // refresh して canonical を更新 → watch が editState を再同期する
    await Promise.all([refreshUsers(), refreshAssignments()])
  }

  // ----------------------------------------------------------------

  const pending = computed<boolean>(
    () => usersPending.value || assignmentsPending.value
  )

  return {
    rows,
    mentorOptions,
    ojtOptions,
    isDirty,
    pending,
    setMentorId,
    setOjtId,
    save
  }
}
