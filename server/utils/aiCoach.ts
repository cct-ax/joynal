import type { AiCoachResponse, MoodValue } from '#shared/types/api'
import { getProp } from './aiChat'

/**
 * 新人コーチング（POST /api/ai/coach）のプロンプト生成と応答パース。
 *
 * 代筆防止は「システムプロンプトで完成文生成を禁止」＋「出力を questions/feedback の構造に固定」＋
 * 「UI に本文挿入ボタンを置かない」の三重で担保する（本ファイルは前2つを担う）。
 */

export const COACH_SYSTEM_PROMPT = `あなたは新人社員の日報の「振り返り」を支援するコーチです。
目的は、新人自身が今日の経験から気づきを言語化できるよう、問いかけで手助けすることです。

厳守事項:
- 日報の本文を代筆・要約・完成させてはいけません。新人が書くべき文章を生成して与えないでください。
- 出力は次の JSON オブジェクトのみとし、前後に説明文やコードフェンスを付けないでください。
  {"questions": ["...", "..."], "feedback": "..."}
- questions には、振り返りを深める質問を2〜3個入れてください（日本語・具体的で答えやすい問い）。
- feedback には、1〜2文の短い励ましや観点の提示を入れてください。評価や断定はせず、本文の代筆もしません。
- 入力のドラフトが空の場合は、書き始めを助けるスターター質問のみを questions に入れ、feedback は空文字 "" にしてください。`

/** ドラフト本文と気分から、コーチング用のユーザーメッセージを組み立てる。 */
export const buildCoachUserMessage = (content?: string, mood?: MoodValue): string => {
  const draft = content?.trim()
  const moodLine = mood ? `今日の気分: ${mood}/5` : '今日の気分: 未入力'
  if (!draft) {
    return `${moodLine}\n\n日報のドラフトはまだありません。書き始めるためのスターター質問をください。`
  }
  return `${moodLine}\n\n日報のドラフト:\n${draft}`
}

/** コードフェンスや前後の説明を無視し、最初の { 〜 最後の } を JSON として解釈する。失敗時 null。 */
const extractJsonObject = (text: string): unknown => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/** AI のテキスト応答を AiCoachResponse に整形する。解釈できなければ null（ハンドラ側で 502）。 */
export const parseCoachResponse = (text: string): AiCoachResponse | null => {
  const parsed = extractJsonObject(text)
  const rawQuestions = getProp(parsed, 'questions')
  if (!Array.isArray(rawQuestions)) return null
  const questions = rawQuestions
    .filter((q): q is string => typeof q === 'string')
    .map(q => q.trim())
    .filter(q => q.length > 0)
  if (questions.length === 0) return null
  const rawFeedback = getProp(parsed, 'feedback')
  const feedback = typeof rawFeedback === 'string' ? rawFeedback.trim() : ''
  return { questions, feedback }
}
