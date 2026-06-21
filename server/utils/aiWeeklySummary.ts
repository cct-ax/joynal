import type { AiAudience } from '#shared/types/api'

/**
 * 週次サマリー（GET/POST /api/ai/weekly-summary）のプロンプト生成・audience 導出・週範囲計算。
 *
 * audience はクライアント指定を信用せず「対象 userId == リクエスト者か」でサーバー導出する
 * （self＝新人本人の振り返り／mentor＝メンター・OJT・管理者の観察）。
 * サマリーは「参考情報」で、評価・断定・代筆をしない方針をプロンプトで担保する。
 */

/** 要約対象の1日分（日報の本文と気分）。 */
export type ReportForSummary = {
  date: string
  content: string
  mood: number | null
}

/** 対象ユーザーがリクエスト者自身なら self、他人なら mentor。 */
export const deriveAudience = (targetUserId: string, requesterId: string): AiAudience =>
  targetUserId === requesterId ? 'self' : 'mentor'

/** 週開始日(YYYY-MM-DD・月曜)から月〜金の範囲を返す。 */
export const weekRange = (weekStart: string): { from: string, to: string } => {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 4)
  return { from: weekStart, to: d.toISOString().slice(0, 10) }
}

export const WEEKLY_SUMMARY_SELF_PROMPT = `あなたは新人社員自身の1週間の振り返りを支援するアシスタントです。
与えられた1週間の日報（やったこと・気分）をもとに、本人が自分の成長やパターンに気づけるよう、
温かく前向きな振り返りの要約を日本語で 3〜5 文で書いてください。

厳守事項:
- これは「参考情報」です。評価や優劣の断定（ジャッジ）はしないでください。
- 日報の代筆や、今後書くべき文章の生成はしないでください。
- 事実にないことを推測で断定しないでください。気づきや問いかけを添えるのは構いません。
- 出力は要約の本文のみ（見出し・箇条書き記号・前置きは付けない）。`

export const WEEKLY_SUMMARY_MENTOR_PROMPT = `あなたは新人の育成を支援するアシスタントです。
担当メンター/OJT 向けに、ある新人の1週間の日報（やったこと・気分）から読み取れる傾向を、
観察・参考情報として日本語で 3〜5 文で要約してください。

厳守事項:
- これは「参考情報」です。評価や優劣の断定（人物評価・ジャッジ）はしないでください。
- 日報の代筆や、メンターが書くべきコメントの生成はしないでください。
- 事実にないことを推測で断定しないでください。気づきの観点を添えるのは構いません。
- 出力は要約の本文のみ（見出し・箇条書き記号・前置きは付けない）。`

/** audience 別のシステムプロンプトを返す。 */
export const systemPromptFor = (audience: AiAudience): string =>
  audience === 'self' ? WEEKLY_SUMMARY_SELF_PROMPT : WEEKLY_SUMMARY_MENTOR_PROMPT

/** その週の日報を、AI に渡すユーザーメッセージへ整形する。 */
export const buildWeeklySummaryUserMessage = (reports: ReportForSummary[]): string => {
  if (reports.length === 0) return 'この週には日報がありません。'
  return reports
    .map((r) => {
      const mood = r.mood ? `気分 ${r.mood}/5` : '気分 未入力'
      return `【${r.date}・${mood}】\n${r.content.trim()}`
    })
    .join('\n\n')
}
