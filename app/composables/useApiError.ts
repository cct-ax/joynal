/**
 * $fetch エラーを toast 通知するための composable。
 *
 * - 特定 statusCode（例: 409）に専用メッセージを割り当てたい
 * - 400 のときはサーバーが返した data.message を優先したい
 * - どれにもマッチしないときは fallback を出す
 *
 * 使い方:
 *   const apiError = useApiError()
 *   try { ... } catch (error: unknown) {
 *     apiError.notify(error, {
 *       statusMessages: { 409: '同じ日付の日報がすでに存在します' },
 *       fallback: '保存に失敗しました'
 *     })
 *   }
 */
import { getFetchMessage, getFetchStatus } from '~/utils/fetchError'

export type ApiErrorOptions = {
  /** 特定の statusCode → 固定メッセージ */
  statusMessages?: Partial<Record<number, string>>
  /** どれにもマッチしないときの最終メッセージ */
  fallback: string
  /** 400 のとき data.message を優先するか（既定: true） */
  preferServerMessageOn400?: boolean
}

export const useApiError = () => {
  const toast = useToast()

  const resolveTitle = (error: unknown, options: ApiErrorOptions): string => {
    const status = getFetchStatus(error)
    const preferServer = options.preferServerMessageOn400 ?? true

    if (status !== null) {
      const fixed = options.statusMessages?.[status]
      if (fixed) return fixed
    }
    if (status === 400 && preferServer) {
      const serverMessage = getFetchMessage(error)
      if (serverMessage) return serverMessage
    }
    return options.fallback
  }

  const notify = (error: unknown, options: ApiErrorOptions): void => {
    toast.add({ title: resolveTitle(error, options), color: 'error' })
  }

  return { notify }
}
