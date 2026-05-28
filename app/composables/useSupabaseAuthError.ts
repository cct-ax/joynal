/**
 * Supabase auth の `{ error: AuthError | null }` パターン専用のエラー toast。
 *
 * - $fetch エラーとは形状・分岐ロジックが完全に異なるため、useApiError とは別 composable
 * - AuthError は常に message を持つので type guard 不要
 *
 * 使い方:
 *   const authError = useSupabaseAuthError()
 *   const { error } = await supabase.auth.signInWithPassword({ ... })
 *   if (error) {
 *     authError.notify(error, { title: 'メールアドレスまたはパスワードが正しくありません' })
 *     return
 *   }
 */
import type { AuthError } from '@supabase/supabase-js'

export type AuthErrorOptions = {
  /** Toast のタイトル（既定の固定文言） */
  title: string
  /** error.message を toast の description として表示するか（既定: false） */
  showDescription?: boolean
}

export const useSupabaseAuthError = () => {
  const toast = useToast()

  const notify = (error: AuthError, options: AuthErrorOptions): void => {
    toast.add({
      title: options.title,
      ...(options.showDescription ? { description: error.message } : {}),
      color: 'error'
    })
  }

  return { notify }
}
