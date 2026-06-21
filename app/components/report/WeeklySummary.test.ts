import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import WeeklySummary from './WeeklySummary.vue'
import type { MoodChartPoint } from '../../utils/moodChart'

const series: MoodChartPoint[] = [
  { date: '2026-05-18', ts: 1, mood: 4 },
  { date: '2026-05-19', ts: 2, mood: null }
]

// unovis を描画させないため MoodTrendChart はスタブする（分岐のみを検証する）。
// AiSummaryPanel は別テストで検証するためスタブ（存在のみ確認）。
const stubs = {
  MoodTrendChart: { template: '<div data-test="chart" />' },
  AiSummaryPanel: { template: '<div data-test="ai-panel" />' }
}
const EMPTY_MESSAGE = 'この期間に記録された気分がありません'

describe('WeeklySummary', () => {
  it('loading 中はスケルトンを出し、チャート/空状態は出さない', async () => {
    const wrapper = await mountSuspended(WeeklySummary, {
      props: { series, hasData: true, loading: true },
      global: { stubs }
    })
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(EMPTY_MESSAGE)
  })

  it('hasData=false なら EmptyState を出す', async () => {
    const wrapper = await mountSuspended(WeeklySummary, {
      props: { series: [], hasData: false },
      global: { stubs }
    })
    expect(wrapper.text()).toContain(EMPTY_MESSAGE)
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
  })

  it('hasData=true なら MoodTrendChart を描画する', async () => {
    const wrapper = await mountSuspended(WeeklySummary, {
      props: { series, hasData: true },
      global: { stubs }
    })
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(EMPTY_MESSAGE)
  })

  it('showChart=false なら気分グラフを出さず AI サマリーパネルのみ', async () => {
    const wrapper = await mountSuspended(WeeklySummary, {
      props: { showChart: false, series: [], hasData: false },
      global: { stubs }
    })
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ai-panel"]').exists()).toBe(true)
  })
})
