import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { MoodTrendPoint } from '#shared/types/api'
import { useMoodTrend } from './useMoodTrend'

const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

type Args = {
  weekStart?: Date
  userId?: string | undefined
  enabled?: boolean
}

// useWeeklyReports.test.ts と同方針: keyed useAsyncData('mood-trend') の重複排除を避けるため
// 各テストで harness を unmount し clearNuxtData する。
let wrapper: VueWrapper | null = null

const mountTrend = async (args: Args = {}) => {
  const currentWeekStart = ref(args.weekStart ?? new Date(2026, 4, 18)) // 2026-05-18(月)
  const userId = ref<string | undefined>(args.userId)
  const enabled = ref(args.enabled ?? true)
  let exposed: ReturnType<typeof useMoodTrend> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useMoodTrend(currentWeekStart, userId, enabled)
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  const result = exposed as ReturnType<typeof useMoodTrend>
  return { ...result, currentWeekStart, userId, enabled }
}

describe('useMoodTrend', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    clearNuxtData('mood-trend')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('mood-trend')
  })

  it('enabled=false の間は API を叩かず points 空（series は平日を null で網羅）', async () => {
    requestFetchMock.mockResolvedValue([{ date: '2026-05-18', mood: 4 }])

    const { points, series } = await mountTrend({ enabled: false })

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(points.value).toEqual([])
    // 8 週ぶんの平日（mood は全て null）
    expect(series.value.every(p => p.mood === null)).toBe(true)
    expect(series.value.length).toBeGreaterThan(0)
  })

  it('現在週(月)から 8 週ぶんの from/to で取得し、userId 無しのとき userId を省く', async () => {
    requestFetchMock.mockResolvedValue([])

    await mountTrend({ weekStart: new Date(2026, 4, 18), userId: undefined })

    expect(requestFetchMock).toHaveBeenCalledWith('/api/reports/mood-trend', {
      query: { from: '2026-03-30', to: '2026-05-22' }
    })
  })

  it('userId 有りのとき query に userId を含める', async () => {
    requestFetchMock.mockResolvedValue([])

    await mountTrend({ userId: 'trainee-1' })

    expect(requestFetchMock).toHaveBeenCalledWith('/api/reports/mood-trend', {
      query: { from: '2026-03-30', to: '2026-05-22', userId: 'trainee-1' }
    })
  })

  it('series は取得した mood を日付に対応づけ、未入力日は null（ギャップ）', async () => {
    const rows: MoodTrendPoint[] = [
      { date: '2026-05-18', mood: 4 },
      { date: '2026-05-20', mood: 2 }
    ]
    requestFetchMock.mockResolvedValue(rows)

    const { series } = await mountTrend()

    const may = series.value.filter(p => p.date >= '2026-05-18' && p.date <= '2026-05-22')
    expect(may.map(p => p.mood)).toEqual([4, null, 2, null, null])
  })

  it('currentWeekStart の変化で新しい範囲を再フェッチする', async () => {
    requestFetchMock.mockResolvedValue([])

    const { currentWeekStart } = await mountTrend({ weekStart: new Date(2026, 4, 18) })
    expect(requestFetchMock).toHaveBeenCalledTimes(1)

    currentWeekStart.value = new Date(2026, 4, 25) // 翌週(月)
    await nextTick()
    await flushPromises()

    expect(requestFetchMock).toHaveBeenCalledTimes(2)
    expect(requestFetchMock).toHaveBeenLastCalledWith('/api/reports/mood-trend', {
      query: { from: '2026-04-06', to: '2026-05-29' }
    })
  })
})
