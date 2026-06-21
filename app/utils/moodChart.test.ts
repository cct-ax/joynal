import { describe, expect, it } from 'vitest'
import { defaultMoodRange, weekdaysInRange, buildMoodSeries } from './moodChart'
import { parseYmd } from '#shared/utils/date'

describe('moodChart', () => {
  describe('defaultMoodRange', () => {
    it('現在週(月)から weeks 週ぶん: from=(weeks-1)週前の月, to=現在週の金', () => {
      const monday = new Date(2026, 4, 18) // 2026-05-18(月)
      expect(defaultMoodRange(monday, 8)).toEqual({ from: '2026-03-30', to: '2026-05-22' })
    })

    it('weeks=1 は現在週のみ（月〜金）', () => {
      const monday = new Date(2026, 4, 18)
      expect(defaultMoodRange(monday, 1)).toEqual({ from: '2026-05-18', to: '2026-05-22' })
    })
  })

  describe('weekdaysInRange', () => {
    it('月〜金の5日を返す', () => {
      expect(weekdaysInRange('2026-05-18', '2026-05-22')).toEqual([
        '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'
      ])
    })

    it('週末（土日）を除外する', () => {
      // 2026-05-23(土)・05-24(日) を挟む → 平日は 05-18〜22 と 05-25(月)
      expect(weekdaysInRange('2026-05-18', '2026-05-25')).toEqual([
        '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-25'
      ])
    })

    it('不正な日付・逆順は空配列', () => {
      expect(weekdaysInRange('2026/05/18', '2026-05-22')).toEqual([])
      expect(weekdaysInRange('2026-05-22', '2026-05-18')).toEqual([])
    })
  })

  describe('buildMoodSeries', () => {
    it('平日を網羅し、mood が無い日は null（ギャップ）にする', () => {
      const points = [
        { date: '2026-05-18', mood: 4 as const },
        { date: '2026-05-20', mood: 2 as const }
      ]
      const series = buildMoodSeries(points, '2026-05-18', '2026-05-22')

      expect(series.map(p => p.date)).toEqual([
        '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'
      ])
      expect(series.map(p => p.mood)).toEqual([4, null, 2, null, null])
    })

    it('各点は x 軸用の timestamp を持つ', () => {
      const series = buildMoodSeries([], '2026-05-18', '2026-05-18')
      expect(series).toHaveLength(1)
      expect(series[0]?.ts).toBe(parseYmd('2026-05-18')?.getTime())
      expect(series[0]?.mood).toBeNull()
    })
  })
})
