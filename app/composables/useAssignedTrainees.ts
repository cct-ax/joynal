import type { AssignmentForAdmin, AssignmentForMentor } from '#shared/types/api'

/**
 * メンター/OJT/管理者が担当する新人の一覧（セレクター用）を取得する composable。
 *
 * - ロールを `useCurrentUser()` から取得し、非 trainee（mentor/ojt/admin）のときだけ
 *   `GET /api/assignments/me` を叩く。trainee / 未解決のときは空配列を返す。
 * - サーバーは role に応じて `AssignmentForMentor[]` か `AssignmentForAdmin[]` を返すが、
 *   いずれも `trainee_id` と `trainee.name` を持つので `{ id, name }` に正規化する。
 * - mentor/ojt は先頭の新人を初期選択（既に選択済みなら維持）、admin は未選択のまま。
 *
 * 設計判断: useCurrentUser と同じく keyed useAsyncData + useRequestFetch で
 * SSR の Cookie 転送と重複排除を行う（await しない＝ページ側の await useAsyncData に委ねる）。
 */
type TraineeOption = {
  id: string
  name: string
}

type AssignmentRow = AssignmentForMentor | AssignmentForAdmin

const toOption = (row: AssignmentRow): TraineeOption => ({
  id: row.trainee_id,
  name: row.trainee.name
})

export const useAssignedTrainees = (): {
  traineeOptions: ComputedRef<TraineeOption[]>
  selectedTraineeId: Ref<string | null>
  pending: Ref<boolean>
} => {
  const { role } = useCurrentUser()
  const requestFetch = useRequestFetch()

  const isAssigner = computed(
    () => role.value === 'mentor' || role.value === 'ojt' || role.value === 'admin'
  )

  // TODO(MS4): admin のセレクタは assignments/me(割り当て済みのみ)ではなく全 trainee(/api/users を role=trainee で絞る)にし、0件時は管理画面へ誘導する

  // server: false — role(current-user)→assignments→reports という依存連鎖を、
  // リアクティビティが確実に働くクライアント側で解決する。SSR では依存解決の順序に
  // よって空を掴みうるため、ボードのデータ取得はクライアントに寄せる（mounted ゲートで
  // スケルトン表示）。current-user は server 取得のままで role は payload から即利用できる。
  const { data, pending } = useAsyncData<AssignmentRow[]>(
    'assignments-me',
    async () =>
      isAssigner.value ? await requestFetch<AssignmentRow[]>('/api/assignments/me') : [],
    { watch: [role], default: () => [], server: false }
  )

  const traineeOptions = computed<TraineeOption[]>(() => (data.value ?? []).map(toOption))

  // 既定選択は watch で後追いセットせず computed で導出する。
  // watch だと SSR では非同期解決後に再フラッシュされず（サーバはセットアップ時の
  // immediate 実行＝options 空のときしか走らない）、クライアントは hydration 時に
  // payload のデータで先頭を選ぶため selectedTraineeId が server/client でずれ、
  // ハイドレーション不整合になる。computed なら描画時に解決済みデータを反映し一致する。
  const explicitSelection = ref<string | null>(null)
  const defaultTraineeId = computed<string | null>(() => {
    // mentor/ojt は先頭の担当新人を既定選択。admin は明示選択を促すため null。
    if (role.value !== 'mentor' && role.value !== 'ojt') return null
    return traineeOptions.value[0]?.id ?? null
  })
  const selectedTraineeId = computed<string | null>({
    get: () => explicitSelection.value ?? defaultTraineeId.value,
    set: (v) => {
      explicitSelection.value = v
    }
  })

  return { traineeOptions, selectedTraineeId, pending }
}
