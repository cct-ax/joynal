import { Time } from '@internationalized/date'

/**
 * "HH:MM"（または "HH:MM:SS"）文字列 ↔ @internationalized/date の Time の変換。
 *
 * - UInputTime は `Time` を扱うが、アプリ内（state・Zod スキーマ・API ボディ）は
 *   "HH:MM" 文字列で統一しているため、本ファイルで橋渡しする。
 * - `date.ts`（純 JS Date）/ `calendarDate.ts`（Date↔CalendarDate）と同じ分離方針で、
 *   `as` は使わず素直に組み替えるだけ。
 */

/** "HH:MM"（先頭が一致すれば "HH:MM:SS" も可）を Time に変換する。空・不正・範囲外は null。 */
export const toTimeValue = (s: string | null | undefined): Time | null => {
  if (!s) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
    return null
  }
  return new Time(hour, minute)
}

/** Time を "HH:MM"（ゼロ埋め・秒なし）に変換する。null は空文字。 */
export const fromTimeValue = (t: Time | null): string => {
  if (!t) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(t.hour)}:${pad(t.minute)}`
}
