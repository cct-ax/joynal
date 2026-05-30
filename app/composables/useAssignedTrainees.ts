import type { AssignmentForMentor } from '#shared/types/api'
import type { Profile } from '#shared/types/models'

/**
 * メンター/OJT/管理者が担当する新人の一覧（セレクター用）を取得する composable。
 *
 * データソースはロールによって異なる:
 * - admin → GET /api/users（全ユーザー）を role=trainee で絞り込む
 * - mentor/ojt → GET /api/assignments/me（担当割り当て済み新人）
 * - trainee / 未解決 → 空配列（API 呼び出しなし）
 *
 * いずれも最終的に `{ id, name }` の TraineeOption[] に正規化して返す。
 * mentor/ojt は先頭の新人を初期選択（既に選択済みなら維持）、admin は未選択のまま
 * （明示的に選ぶことを促す）。
 *
 * 設計判断: useCurrentUser と同じく keyed useAsyncData + useRequestFetch で
 * SSR の Cookie 転送と重複排除を行う（await しない＝ページ側の await useAsyncData に委ねる）。
 */
type TraineeOption = {
  id: string
  name: string
}

/** mentor/ojt 向け: assignments/me レスポンスの最低限の型 */
type AssignmentRow = AssignmentForMentor & { trainee_id: string, trainee: { name: string } }

export const useAssignedTrainees = (): {
  traineeOptions: ComputedRef<TraineeOption[]>
  selectedTraineeId: Ref<string | null>
  pending: Ref<boolean>
} => {
  const { role } = useCurrentUser()
  const requestFetch = useRequestFetch()

  // server: false — role(current-user)→データ取得→reports という依存連鎖を、
  // リアクティビティが確実に働くクライアント側で解決する。SSR では依存解決の順序に
  // よって空を掴みうるため、ボードのデータ取得はクライアントに寄せる（mounted ゲートで
  // スケルトン表示）。current-user は server 取得のままで role は payload から即利用できる。
  const { data, pending } = useAsyncData<TraineeOption[]>(
    'assignments-me',
    async (): Promise<TraineeOption[]> => {
      if (role.value === 'admin') {
        // admin は全ユーザーから trainee だけを抽出してセレクタに表示する
        const users = await requestFetch<Profile[]>('/api/users')
        return users
          .filter(u => u.role === 'trainee')
          .map(u => ({ id: u.id, name: u.name }))
      }
      if (role.value === 'mentor' || role.value === 'ojt') {
        // mentor/ojt は割り当て済み新人のみ
        const rows = await requestFetch<AssignmentRow[]>('/api/assignments/me')
        return rows.map(r => ({ id: r.trainee_id, name: r.trainee.name }))
      }
      // trainee / 未解決はデータ不要
      return []
    },
    { watch: [role], default: () => [], server: false }
  )

  const traineeOptions = computed<TraineeOption[]>(() => data.value ?? [])

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
