import type { AiCoachBody, AiCoachResponse, MoodValue } from '#shared/types/api'

/**
 * 新人コーチング（POST /api/ai/coach）の取得用 composable。
 *
 * 入力中の日報ドラフトと気分を渡し、振り返りの深掘り質問＋短評を取得する。
 * ミューテーション系（イベント駆動）なので $fetch を useApiError でラップする。
 * 本文への挿入導線は UI 側に持たない（代筆防止）。
 */
export const useCoach = () => {
  const apiError = useApiError()
  const hints = ref<AiCoachResponse | null>(null)
  const pending = ref(false)

  /** ドラフト本文（任意）と気分（任意）を渡してヒントを取得する。 */
  const fetchHints = async (content?: string, mood?: MoodValue): Promise<void> => {
    const draft = content?.trim()
    const body: AiCoachBody = {
      ...(draft ? { content: draft } : {}),
      ...(mood !== undefined ? { mood } : {})
    }
    pending.value = true
    try {
      hints.value = await $fetch('/api/ai/coach', { method: 'POST', body })
    } catch (error: unknown) {
      apiError.notify(error, { fallback: 'ヒントの取得に失敗しました' })
    } finally {
      pending.value = false
    }
  }

  /** 表示中のヒントをクリアする（モーダルを開き直したとき等）。 */
  const reset = (): void => {
    hints.value = null
  }

  return { hints, pending, fetchHints, reset }
}
