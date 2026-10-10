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

/**
 * 時刻文字列を表示用の "HH:MM"（秒なし・ゼロ埋め）に整形する。
 * DB の time 型は PostgREST 経由で "HH:MM:SS" を返すため、一覧などの表示側で秒を落とす。
 * 空・不正は空文字。
 */
export const toHm = (s: string | null | undefined): string =>
  fromTimeValue(toTimeValue(s))

/**
 * 時刻候補ピッカー用に "HH:MM" を interval 分刻みで 1 日分（00:00〜）生成する。
 * 日報の出退勤は 15 分単位（HH:00/15/30/45）が仕様のため、既定は 15。
 * interval は 1〜1440 の整数のみ受け付け、それ以外は空配列を返す。
 */
export const buildTimeOptions = (intervalMinutes = 15): string[] => {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 24 * 60) {
    return []
  }
  const count = Math.floor((24 * 60) / intervalMinutes)
  return Array.from({ length: count }, (_, i) => {
    const total = i * intervalMinutes
    return fromTimeValue(new Time(Math.floor(total / 60), total % 60))
  })
}
