import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { CommentWithCommenter } from '#shared/types/api'
import { useWeeklyComments } from './useWeeklyComments'

const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const makeComment = (
  role: 'mentor' | 'ojt',
  content: string
): CommentWithCommenter => ({
  id: `c-${role}`,
  week_start: '2026-05-25',
  trainee_id: 't1',
  commenter_id: `${role}-1`,
  content,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z',
  commenter: { name: role === 'mentor' ? 'メンター' : 'OJT担当', role }
})

type Args = {
  weekStartYmd?: string
  traineeId?: string | null
}

// keyed useAsyncData の重複排除を避けるため、テスト間で harness を unmount する
// （前テストの asyncData が残ると handler が再実行されない）。
let wrapper: VueWrapper | null = null

const mountComments = async (args: Args = {}) => {
  const weekStartYmd = ref(args.weekStartYmd ?? '2026-05-25')
  // 'traineeId' in args で「明示的な null」と「未指定（既定 t1）」を区別する
  // （null ?? 't1' だと明示 null まで t1 に潰れてしまうため）。
  const traineeId = ref<string | null>('traineeId' in args ? (args.traineeId ?? null) : 't1')
  let exposed: ReturnType<typeof useWeeklyComments> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useWeeklyComments(weekStartYmd, traineeId)
        return () => h('div')
      }
    })
  )
  // exposed は setup クロージャ内で代入されるため flow narrowing が効かない。
  // 実行時の null チェックを残しつつ、spread 用に明示キャストで型を絞る。
  if (!exposed) throw new Error('composable not initialized')
  const result = exposed as ReturnType<typeof useWeeklyComments>
  return { ...result, weekStartYmd, traineeId }
}

describe('useWeeklyComments', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    clearNuxtData('comments-week')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('comments-week')
  })

  it('traineeId が null の間は API を叩かず空配列・コメント null', async () => {
    requestFetchMock.mockResolvedValue([makeComment('mentor', 'x')])

    const { comments, mentorComment, ojtComment } = await mountComments({ traineeId: null })

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(comments.value).toEqual([])
    expect(mentorComment.value).toBeNull()
    expect(ojtComment.value).toBeNull()
  })

  it('traineeId 有りで weekStart / traineeId を query に渡す', async () => {
    requestFetchMock.mockResolvedValue([])

    await mountComments({ weekStartYmd: '2026-06-01', traineeId: 't42' })

    expect(requestFetchMock).toHaveBeenCalledWith('/api/comments', {
      query: { weekStart: '2026-06-01', traineeId: 't42' }
    })
  })

  it('commenter.role で mentor / ojt に振り分ける', async () => {
    requestFetchMock.mockResolvedValue([
      makeComment('mentor', 'メンターコメント'),
      makeComment('ojt', 'OJTコメント')
    ])

    const { mentorComment, ojtComment } = await mountComments()

    expect(mentorComment.value?.content).toBe('メンターコメント')
    expect(ojtComment.value?.content).toBe('OJTコメント')
  })

  it('片方のロールしか無ければもう片方は null', async () => {
    requestFetchMock.mockResolvedValue([makeComment('mentor', 'メンターのみ')])

    const { mentorComment, ojtComment } = await mountComments()

    expect(mentorComment.value?.content).toBe('メンターのみ')
    expect(ojtComment.value).toBeNull()
  })

  it('traineeId が null→ID に変わったら再フェッチする（admin が新人を選択）', async () => {
    requestFetchMock.mockResolvedValue([])

    const { traineeId } = await mountComments({ traineeId: null })
    expect(requestFetchMock).not.toHaveBeenCalled()

    traineeId.value = 't99'
    await nextTick()
    await flushPromises()

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    expect(requestFetchMock).toHaveBeenLastCalledWith('/api/comments', {
      query: { weekStart: '2026-05-25', traineeId: 't99' }
    })
  })
})
