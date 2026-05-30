import { describe, expect, it } from 'vitest'
import { formatYmd, getMondayOf } from '#shared/utils/date'

describe('useWeekNavigation', () => {
  it('initial を渡さなければ今週月曜から始まる', () => {
    const { currentWeekStart, isThisWeek } = useWeekNavigation()
    const thisMonday = getMondayOf(new Date())
    expect(formatYmd(currentWeekStart.value)).toBe(formatYmd(thisMonday))
    expect(isThisWeek.value).toBe(true)
  })

  it('過去日付の initial で今週判定が false', () => {
    const { isThisWeek } = useWeekNavigation(new Date(2024, 0, 1))
    expect(isThisWeek.value).toBe(false)
  })

  it('goPrev で -7 日に移動', () => {
    const { currentWeekStart, goPrev } = useWeekNavigation(new Date(2026, 4, 25))
    goPrev()
    expect(formatYmd(currentWeekStart.value)).toBe('2026-05-18')
  })

  it('goNext で +7 日に移動', () => {
    const { currentWeekStart, goNext } = useWeekNavigation(new Date(2026, 4, 25))
    goNext()
    expect(formatYmd(currentWeekStart.value)).toBe('2026-06-01')
  })

  it('goThisWeek で今週に戻る', () => {
    const { currentWeekStart, goPrev, goThisWeek } = useWeekNavigation()
    goPrev()
    goPrev()
    goThisWeek()
    expect(formatYmd(currentWeekStart.value)).toBe(formatYmd(getMondayOf(new Date())))
  })

  it('goTo で任意日が含まれる週の月曜に正規化', () => {
    const { currentWeekStart, goTo } = useWeekNavigation()
    goTo(new Date(2026, 4, 28)) // 木曜日
    expect(formatYmd(currentWeekStart.value)).toBe('2026-05-25') // その週の月曜
  })

  it('weekStartYmd / weekLabel / weekDays が同期する', () => {
    const { weekStartYmd, weekLabel, weekDays } = useWeekNavigation(new Date(2026, 4, 25))
    expect(weekStartYmd.value).toBe('2026-05-25')
    expect(weekLabel.value).toContain('2026/5/25')
    expect(weekDays.value).toHaveLength(5)
  })
})
