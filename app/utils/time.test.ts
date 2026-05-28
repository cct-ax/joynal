import { describe, expect, it } from 'vitest'
import { Time } from '@internationalized/date'
import { fromTimeValue, toTimeValue } from './time'

describe('time', () => {
  it('toTimeValue は "HH:MM" を Time に変換する', () => {
    const t = toTimeValue('09:05')
    expect(t?.hour).toBe(9)
    expect(t?.minute).toBe(5)
  })

  it('toTimeValue は "HH:MM:SS" の秒を無視する', () => {
    const t = toTimeValue('18:30:45')
    expect(t?.hour).toBe(18)
    expect(t?.minute).toBe(30)
  })

  it.each(['', 'bad', '25:00', '12:60'])(
    'toTimeValue は不正値「%s」を null にする',
    (input) => {
      expect(toTimeValue(input)).toBeNull()
    }
  )

  it('toTimeValue は null/undefined を null にする', () => {
    expect(toTimeValue(null)).toBeNull()
    expect(toTimeValue(undefined)).toBeNull()
  })

  it('fromTimeValue はゼロ埋めの "HH:MM" を返す（秒なし）', () => {
    expect(fromTimeValue(new Time(9, 5))).toBe('09:05')
    expect(fromTimeValue(new Time(18, 0))).toBe('18:00')
  })

  it('fromTimeValue は null を空文字にする', () => {
    expect(fromTimeValue(null)).toBe('')
  })

  it('往復で同じ "HH:MM" になる', () => {
    for (const s of ['00:00', '09:30', '23:59']) {
      expect(fromTimeValue(toTimeValue(s))).toBe(s)
    }
  })
})
