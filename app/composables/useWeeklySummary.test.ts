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

/** フレーム文字列の配列を SSE バイトストリームに変換する（generate の responseType:'stream' 用）。 */
const sseStream = (frames: string[]): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    }
  })

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

  it('generate で SSE を POST し delta を連結して summary を更新する', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockResolvedValue(sseStream([
      'event: delta\ndata: {"text":"生成"}\n\n',
      'event: delta\ndata: {"text":"済み"}\n\n',
      'event: done\ndata: {"audience":"self","sourceUpdatedAt":"2026-05-20T00:00:00Z"}\n\n'
    ]))
    const { summary, generate, streamingContent } = await mountSummary()

    await generate()

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/weekly-summary', expect.objectContaining({
      method: 'POST',
      responseType: 'stream',
      body: { userId: 'trainee-1', weekStart: '2026-05-18' }
    }))
    expect(summary.value?.content).toBe('生成済み')
    expect(summary.value?.sourceUpdatedAt).toBe('2026-05-20T00:00:00Z')
    // 完了後は streamingContent をクリアし summary 表示に切り替える
    expect(streamingContent.value).toBe('')
  })

  it('error イベントで error トースト、summary は変わらない', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockResolvedValue(sseStream([
      'event: error\ndata: {"message":"AI 応答の取得に失敗しました","code":"AI_UPSTREAM_ERROR"}\n\n'
    ]))
    const { summary, generate } = await mountSummary()

    await generate()

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(summary.value).toBeNull()
  })

  it('done も error も来ずに途切れたら error トースト・summary は変わらない', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockResolvedValue(sseStream([
      'event: delta\ndata: {"text":"途中まで"}\n\n'
    ]))
    const { summary, generate } = await mountSummary()

    await generate()

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(summary.value).toBeNull()
  })

  it('POST 自体が reject（事前チェック失敗）でも error トースト', async () => {
    requestFetchMock.mockResolvedValue({ summary: null, latestReportUpdatedAt: null })
    fetchMock.mockRejectedValue({ statusCode: 429 })
    const { summary, generate } = await mountSummary()

    await generate()

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(summary.value).toBeNull()
  })
})
