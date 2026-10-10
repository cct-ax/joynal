import type { MoodTrendPoint, MoodValue } from '#shared/types/api'
import { parseYmd, addDays, formatYmd } from '#shared/utils/date'

/**
 * mood 推移グラフ用の純粋ロジック（app 専用）。
 *
 * - 表示範囲は「現在週の月曜から N 週ぶん遡った月曜 〜 現在週の金曜」。
 * - 新人は平日（月〜金）にしか日報を書かないため、x 軸も平日のみで構成する。
 * - mood 未入力の日は `null`（チャートのギャップ）として埋める。
 * - x 軸用に各日付の timestamp（ローカル基準）を持たせる。
 */

/** チャート1点。mood が null の日は線のギャップになる。 */
export type MoodChartPoint = {
  date: string
  ts: number
  mood: MoodValue | null
}

const MS_PER_WEEK_DAYS = 7

/**
 * 現在週（月曜）から weeks 週ぶんの表示範囲を返す。
 * from = (weeks-1) 週前の月曜、to = 現在週の金曜。
 */
export const defaultMoodRange = (
  currentWeekStart: Date,
  weeks = 8
): { from: string, to: string } => {
  const safeWeeks = Math.max(1, Math.trunc(weeks))
  const from = addDays(currentWeekStart, -MS_PER_WEEK_DAYS * (safeWeeks - 1))
  const to = addDays(currentWeekStart, 4) // 月曜 + 4 = 金曜
  return { from: formatYmd(from), to: formatYmd(to) }
}

/**
 * [from, to]（両端含む）の平日（月〜金）の YYYY-MM-DD を昇順で返す。
 * from / to が不正な日付形式なら空配列。
 */
export const weekdaysInRange = (from: string, to: string): string[] => {
  const start = parseYmd(from)
  const end = parseYmd(to)
  if (!start || !end || start > end) return []

  const days: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) {
      days.push(formatYmd(d))
    }
  }
  return days
}

/**
 * 取得済みの mood 点を、[from, to] の平日を網羅した連続系列に整形する。
 * mood が無い日は `mood: null`（ギャップ）にする。
 */
export const buildMoodSeries = (
  points: readonly MoodTrendPoint[],
  from: string,
  to: string
): MoodChartPoint[] => {
  const moodByDate = new Map<string, MoodValue>(points.map(p => [p.date, p.mood]))
  return weekdaysInRange(from, to).map((date) => {
    const parsed = parseYmd(date)
    return {
      date,
      ts: parsed ? parsed.getTime() : 0,
      mood: moodByDate.get(date) ?? null
    }
  })
}
