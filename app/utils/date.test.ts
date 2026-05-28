import { describe, expect, it } from 'vitest'
import {
  DAY_LABELS,
  addDays,
  formatMonthDay,
  formatWeekLabel,
  formatYmd,
  getMondayOf,
  getWeekDays,
  parseYmd
} from './date'

describe('getMondayOf', () => {
  it('月曜日はそのまま返す', () => {
    // 2026-05-25 は月曜
    const monday = new Date(2026, 4, 25)
    const result = getMondayOf(monday)
    expect(formatYmd(result)).toBe('2026-05-25')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('火曜日 → 前日（月曜）', () => {
    const tuesday = new Date(2026, 4, 26)
    expect(formatYmd(getMondayOf(tuesday))).toBe('2026-05-25')
  })

  it('金曜日 → 4日前（月曜）', () => {
    const friday = new Date(2026, 4, 29)
    expect(formatYmd(getMondayOf(friday))).toBe('2026-05-25')
  })

  it('土曜日 → 5日前（月曜）', () => {
    const saturday = new Date(2026, 4, 30)
    expect(formatYmd(getMondayOf(saturday))).toBe('2026-05-25')
  })

  it('日曜日 → 前週月曜（6日前）', () => {
    const sunday = new Date(2026, 4, 31)
    expect(formatYmd(getMondayOf(sunday))).toBe('2026-05-25')
  })

  it('元の Date を破壊しない', () => {
    const original = new Date(2026, 4, 27, 15, 30)
    const result = getMondayOf(original)
    expect(original.getDate()).toBe(27)
    expect(result.getDate()).toBe(25)
  })
})

describe('getWeekDays', () => {
  it('月曜から金曜の5日を返す', () => {
    const monday = new Date(2026, 4, 25)
    const days = getWeekDays(monday)
    expect(days).toHaveLength(5)
    expect(days.map(formatYmd)).toEqual([
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
      '2026-05-29'
    ])
  })

  it('月をまたぐ週も正しく処理する', () => {
    // 2026-08-31 は月曜
    const monday = new Date(2026, 7, 31)
    const days = getWeekDays(monday)
    expect(days.map(formatYmd)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04'
    ])
  })
})

describe('formatYmd', () => {
  it('Date を YYYY-MM-DD に変換する', () => {
    expect(formatYmd(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatYmd(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('1桁の月日を 0 詰めする', () => {
    expect(formatYmd(new Date(2026, 4, 1))).toBe('2026-05-01')
  })
})

describe('formatMonthDay', () => {
  it('M/DD 形式に変換する', () => {
    expect(formatMonthDay(new Date(2026, 4, 5))).toBe('5/05')
    expect(formatMonthDay(new Date(2026, 11, 31))).toBe('12/31')
  })
})

describe('formatWeekLabel', () => {
  it('週ラベルを生成する', () => {
    const monday = new Date(2026, 4, 25)
    expect(formatWeekLabel(monday)).toBe('2026/5/25（月）〜 5/29（金）')
  })

  it('月またぎでも金曜の月を正しく出す', () => {
    const monday = new Date(2026, 7, 31)
    expect(formatWeekLabel(monday)).toBe('2026/8/31（月）〜 9/04（金）')
  })
})

describe('addDays', () => {
  it('翌日を返す', () => {
    expect(formatYmd(addDays(new Date(2026, 4, 25), 1))).toBe('2026-05-26')
  })

  it('1週間後を返す', () => {
    expect(formatYmd(addDays(new Date(2026, 4, 25), 7))).toBe('2026-06-01')
  })

  it('負の値で過去日を返す', () => {
    expect(formatYmd(addDays(new Date(2026, 4, 25), -7))).toBe('2026-05-18')
  })

  it('元の Date を破壊しない', () => {
    const original = new Date(2026, 4, 25)
    addDays(original, 7)
    expect(original.getDate()).toBe(25)
  })
})

describe('parseYmd', () => {
  it('有効な YYYY-MM-DD をパースする', () => {
    const result = parseYmd('2026-05-25')
    expect(result).not.toBeNull()
    expect(result!.getFullYear()).toBe(2026)
    expect(result!.getMonth()).toBe(4)
    expect(result!.getDate()).toBe(25)
  })

  it('不正形式は null', () => {
    expect(parseYmd('2026/05/25')).toBeNull()
    expect(parseYmd('2026-5-25')).toBeNull()
    expect(parseYmd('hello')).toBeNull()
    expect(parseYmd('')).toBeNull()
  })
})

describe('DAY_LABELS', () => {
  it('月〜金の5要素を持つ', () => {
    expect(DAY_LABELS).toEqual(['月', '火', '水', '木', '金'])
  })
})
