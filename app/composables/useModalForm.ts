/**
 * 入力モーダル共通の lifecycle をまとめる composable。
 *
 * 入力モーダル（ReportInputModal / CommentInputModal / UserFormModal）は
 * 次の定型を共有する:
 *   - reactive な state を持ち、開くたびに初期値へリセットする
 *   - submit で loading を切り替えつつ $fetch を try/catch し、失敗時は
 *     useApiError でトースト通知する
 *
 * ドメインロジック（mood 変換・role 制限・各 Zod スキーマ・API ボディ・
 * emit の引数など）は各モーダルに残し、本 composable は開閉リセットと
 * submit の loading/error 定型のみを担う。
 *
 * 使い方:
 *   const { state, loading, submit } = useModalForm<ReportSchema, Partial<ReportSchema>>({
 *     isOpen: () => props.open,
 *     buildState: () => ({ date: '', ... }),     // 開くたびに作り直す state
 *     onSubmit: async (data) => { ...$fetch... }, // 成功本体（toast/emit/close 含む）
 *     errorOptions: () => ({ fallback: '保存に失敗しました' })
 *   })
 *
 * `state` はリアクティブなので、テンプレートの v-model にそのまま渡せる。
 * `submit` は UForm @submit ハンドラと defineExpose の双方から呼べる。
 */
import type { UnwrapNestedRefs } from 'vue'
import type { ApiErrorOptions } from '~/composables/useApiError'

export type UseModalFormOptions<TData, TState extends object> = {
  /** モーダルの開閉状態を返す getter（props.open / defineModel の値など） */
  isOpen: () => boolean
  /**
   * 開くたびに作り直す state の初期値を返す。
   * 編集対象 prop などを参照して都度新しいオブジェクトを返すこと。
   */
  buildState: () => TState
  /**
   * 送信成功時の本体。$fetch・成功トースト・emit・close をここで行う。
   * 例外を投げると submit ラッパーが捕捉して errorOptions で通知する。
   */
  onSubmit: (data: TData) => Promise<void>
  /**
   * 失敗時に useApiError へ渡すオプションを返す。
   * fallback がモード（招待/編集）で変わるケースに対応するため関数で受ける。
   */
  errorOptions: () => ApiErrorOptions
}

export type UseModalFormReturn<TData, TState extends object> = {
  /** v-model に渡すリアクティブなフォーム state */
  state: UnwrapNestedRefs<TState>
  /** 送信中フラグ（UButton :loading に渡す） */
  loading: Ref<boolean>
  /** state を buildState() の初期値へ戻す */
  reset: () => void
  /** loading 切替 + try/catch + 失敗時 useApiError 通知でラップした送信処理 */
  submit: (data: TData) => Promise<void>
}

export const useModalForm = <TData, TState extends object>(
  options: UseModalFormOptions<TData, TState>
): UseModalFormReturn<TData, TState> => {
  const apiError = useApiError()
  const loading = ref(false)

  // state は最初の初期値で組み立て、以後 reset() でキー単位に上書きする
  // （reactive の参照を保つため Object.assign で代入する）。
  const state = reactive(options.buildState())

  const reset = (): void => {
    Object.assign(state, options.buildState())
  }

  // 開閉に追従して state をリセットする。immediate: true で初回マウント時
  // （open=true 付き）にも反映させ、既存3モーダルの挙動を踏襲する。
  watch(options.isOpen, reset, { immediate: true })

  const submit = async (data: TData): Promise<void> => {
    loading.value = true
    try {
      await options.onSubmit(data)
    } catch (error: unknown) {
      apiError.notify(error, options.errorOptions())
    } finally {
      loading.value = false
    }
  }

  return { state, loading, reset, submit }
}
