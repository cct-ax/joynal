import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { DailyReport } from '#shared/types/models'
import { useWeeklyReports } from './useWeeklyReports'

const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const makeReport = (date: string): DailyReport => ({
  id: `rep-${date}`,
  user_id: 'u1',
  date,
  check_in: '09:00',
  check_out: '18:00',
  content: `${date} の作業`,
  mood: 3,
  created_at: `${date}T00:00:00Z`,
  updated_at: `${date}T00:00:00Z`
})

type Args = {
  weekStartYmd?: string
  userId?: string | undefined
  enabled?: boolean
}

// composable の戻り値と、テストから書き換え可能な入力 ref を harness 経由で取り出す。
// keyed useAsyncData は同一 Nuxt インスタンス内でキー単位に重複排除されるため、
// テスト間で harness を unmount しないと前テストの asyncData が再利用され handler が再実行されない。
let wrapper: VueWrapper | null = null

const mountReports = async (args: Args = {}) => {
  const weekStartYmd = ref(args.weekStartYmd ?? '2026-05-25')
  const userId = ref<string | undefined>(args.userId)
  const enabled = ref(args.enabled ?? true)
  let exposed: ReturnType<typeof useWeeklyReports> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useWeeklyReports(weekStartYmd, userId, enabled)
        return () => h('div')
      }
    })
  )
  // exposed は setup クロージャ内で代入されるため flow narrowing が効かない。
  // 実行時の null チェックを残しつつ、spread 用に明示キャストで型を絞る。
  if (!exposed) throw new Error('composable not initialized')
  const result = exposed as ReturnType<typeof useWeeklyReports>
  return { ...result, weekStartYmd, userId, enabled }
}

describe('useWeeklyReports', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    clearNuxtData('reports-week')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('reports-week')
  })

  it('enabled=false の間は API を叩かず空配列', async () => {
    requestFetchMock.mockResolvedValue([makeReport('2026-05-25')])

    const { reports, reportByDate } = await mountReports({ enabled: false })

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(reports.value).toEqual([])
    expect(reportByDate.value).toEqual({})
  })

  it('userId 無しのとき query は weekStart のみ', async () => {
    requestFetchMock.mockResolvedValue([])

    await mountReports({ weekStartYmd: '2026-05-25', userId: undefined })

    expect(requestFetchMock).toHaveBeenCalledWith('/api/reports', {
      query: { weekStart: '2026-05-25' }
    })
  })

  it('userId 有りのとき query に userId を含める', async () => {
    requestFetchMock.mockResolvedValue([])

    await mountReports({ weekStartYmd: '2026-05-25', userId: 'trainee-1' })

    expect(requestFetchMock).toHaveBeenCalledWith('/api/reports', {
      query: { weekStart: '2026-05-25', userId: 'trainee-1' }
    })
  })

  it('reportByDate は report.date をキーに索引化する', async () => {
    requestFetchMock.mockResolvedValue([
      makeReport('2026-05-25'),
      makeReport('2026-05-27')
    ])

    const { reportByDate } = await mountReports()

    expect(Object.keys(reportByDate.value)).toEqual(['2026-05-25', '2026-05-27'])
    expect(reportByDate.value['2026-05-25']?.content).toBe('2026-05-25 の作業')
  })

  it('weekStartYmd の変化で新しい週を再フェッチする', async () => {
    requestFetchMock.mockResolvedValue([])

    const { weekStartYmd } = await mountReports({ weekStartYmd: '2026-05-25' })
    expect(requestFetchMock).toHaveBeenCalledTimes(1)

    weekStartYmd.value = '2026-06-01'
    await nextTick()
    await flushPromises()

    expect(requestFetchMock).toHaveBeenCalledTimes(2)
    expect(requestFetchMock).toHaveBeenLastCalledWith('/api/reports', {
      query: { weekStart: '2026-06-01' }
    })
  })
})
