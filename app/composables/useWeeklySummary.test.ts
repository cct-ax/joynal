import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { useWeeklySummary } from './useWeeklySummary'

const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)
const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

let wrapper: VueWrapper | null = null
const fetchMock = vi.fn()

const mountSummary = async (args: { userId?: string, enabled?: boolean, weekStart?: string } = {}) => {
  const weekStart = ref(args.weekStart ?? '2026-05-18')
  const userId = ref<string | undefined>('userId' in args ? args.userId : 'trainee-1')
  const enabled = ref(args.enabled ?? true)
  let exposed: ReturnType<typeof useWeeklySummary> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useWeeklySummary(weekStart, userId, enabled)
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useWeeklySummary>
}

describe('useWeeklySummary', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    fetchMock.mockReset()
    toastAddMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    clearNuxtData('weekly-summary')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
    clearNuxtData('weekly-summary')
  })

  it('enabled=false の間は取得せず summary は null', async () => {
    requestFetchMock.mockResolvedValue({
      summary: { content: 'x', audience: 'self', sourceUpdatedAt: 't' },
      latestReportUpdatedAt: 't'
    })
    const { summary } = await mountSummary({ enabled: false })
    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(summary.value).toBeNull()
  })

  it('GET でキャッシュを取得し summary に反映する', async () => {
    requestFetchMock.mockResolvedValue({
      summary: { content: 'サマリー', audience: 'mentor', sourceUpdatedAt: '2026-05-18T00:00:00Z' },
      latestReportUpdatedAt: '2026-05-18T00:00:00Z'
    })
    const { summary } = await mountSummary({ userId: 'trainee-1' })
    expect(requestFetchMock).toHaveBeenCalledWith('/api/ai/weekly-summary', {
      query: { userId: 'trainee-1', weekStart: '2026-05-18' }
    })
    expect(summary.value?.content).toBe('サマリー')
  })

  it('保存時より新しい日報があると stale = true', async () => {
    requestFetchMock.mockResolvedValue({
      summary: { content: 'x', audience: 'self', sourceUpdatedAt: '2026-05-18T00:00:00Z' },
      latestReportUpdatedAt: '2026-05-20T00:00:00Z'
    })
    const { stale } = await mountSummary()
    expect(stale.value).toBe(true)
  })

  it('鮮度が同じなら stale = false', async () => {
    requestFetchMock.mockResolvedValue({
      summary: { content: 'x', audience: 'self', sourceUpdatedAt: '2026-05-20T00:00:00Z' },
      latestReportUpdatedAt: '2026-05-20T00:00:00Z'
    })
    const { stale } = await mountSummary()
    expect(stale.value).toBe(false)
  })

  it('generate で POST し summary を更新する', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockResolvedValue({ content: '生成済み', audience: 'self', sourceUpdatedAt: '2026-05-20T00:00:00Z' })
    const { summary, generate } = await mountSummary()

    await generate()

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/weekly-summary', {
      method: 'POST',
      body: { userId: 'trainee-1', weekStart: '2026-05-18' }
    })
    expect(summary.value?.content).toBe('生成済み')
  })

  it('generate 失敗で error トースト、summary は変わらない', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockRejectedValue({ statusCode: 502 })
    const { summary, generate } = await mountSummary()

    await generate()

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(summary.value).toBeNull()
  })
})
