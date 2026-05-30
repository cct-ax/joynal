/**
 * 日付ユーティリティ
 *
 * - すべてローカルタイムゾーンで動作する（toISOString は UTC のため使わない）。
 * - ローカル日付を `YYYY-MM-DD` 文字列に変換する場合は formatYmd を使う。
 * - 月曜起点の週ベース（月〜金の5日）で日報を扱うため、関連関数を集約する。
 */

/**
 * 指定日を含む週の月曜日（時刻 00:00:00）を返す。
 * 日曜の場合は前週の月曜になる。
 */
export const getMondayOf = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 月曜日から金曜日までの5日分の Date 配列を返す。
 */
export const getWeekDays = (monday: Date): Date[] =>
  Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

/**
 * Date を YYYY-MM-DD 形式のローカル日付文字列に変換する。
 * Date#toISOString は UTC のため日本時間と1日ズレるケースがあり、使わない。
 */
export const formatYmd = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Date を M/DD 形式の文字列に変換する（例: 4/21）。
 */
export const formatMonthDay = (date: Date): string =>
  `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`

/**
 * 曜日ラベル（日曜起点）。getDay() の戻り値をそのままインデックスにできる。
 */
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * Date の曜日ラベル（日〜土）を返す。
 */
export const weekdayLabel = (date: Date): string => WEEKDAY_LABELS[date.getDay()] ?? ''

/**
 * Date を `YYYY/M/DD（曜）` 形式に整形する（例: 2026/5/29（金））。
 */
export const formatDateWithWeekday = (date: Date): string =>
  `${date.getFullYear()}/${formatMonthDay(date)}（${weekdayLabel(date)}）`

/**
 * 週ラベルを `YYYY/M/DD（月）〜 M/DD（金）` 形式で返す。
 */
export const formatWeekLabel = (monday: Date): string => {
  const friday = getWeekDays(monday).at(-1)!
  return `${monday.getFullYear()}/${formatMonthDay(monday)}（月）〜 ${formatMonthDay(friday)}（金）`
}

/**
 * 指定日数だけ移動した新しい Date を返す（破壊的変更なし）。
 */
export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * 'YYYY-MM-DD' 文字列をローカル基準の Date にパースする。
 * 形式不正の場合は null を返す。
 */
export const parseYmd = (ymd: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(Number(y), Number(mo) - 1, Number(d))
}
