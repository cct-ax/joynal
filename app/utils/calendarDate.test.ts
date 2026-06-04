import { describe, expect, it } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import { fromCalendarDate, toCalendarDate } from './calendarDate'

describe('calendarDate', () => {
  it('toCalendarDate は年月日を保持する（month は 1 始まり）', () => {
    const cd = toCalendarDate(new Date(2026, 4, 25)) // 2026-05-25
    expect([cd.year, cd.month, cd.day]).toEqual([2026, 5, 25])
  })

  it('fromCalendarDate は年月日を保持する（month を 0 始まりに戻す）', () => {
    const d = fromCalendarDate(new CalendarDate(2026, 5, 25))
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 4, 25])
  })

  it('往復で同じ日付になる（年跨ぎ・うるう日を含む）', () => {
    for (const src of [
      new Date(2025, 11, 31), // 2025-12-31
      new Date(2026, 0, 1), //  2026-01-01
      new Date(2024, 1, 29) //  2024-02-29（うるう日）
    ]) {
      const round = fromCalendarDate(toCalendarDate(src))
      expect([round.getFullYear(), round.getMonth(), round.getDate()])
        .toEqual([src.getFullYear(), src.getMonth(), src.getDate()])
    }
  })
})
