import { CalendarDate, type DateValue } from '@internationalized/date'

/**
 * JS Date ↔ @internationalized/date（UCalendar が扱う型）の変換ユーティリティ。
 *
 * - UCalendar は `CalendarDate`（年月日のみ・タイムゾーン非依存）を扱う。
 * - アプリ内のローカル日付 `Date` との橋渡しに使う。`as` キャストは不要で、
 *   year/month/day を素直に組み替えるだけ（month の 1始まり↔0始まりに注意）。
 * - `date.ts` を純粋な JS Date ユーティリティのまま保つため、本ファイルに分離する。
 */

/** ローカル `Date` を `CalendarDate` に変換する（month は 1 始まり）。 */
export const toCalendarDate = (d: Date): CalendarDate =>
  new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())

/** `CalendarDate`（や `DateValue`）をローカル `Date` に変換する（month を 0 始まりに戻す）。 */
export const fromCalendarDate = (cd: DateValue): Date =>
  new Date(cd.year, cd.month - 1, cd.day)
