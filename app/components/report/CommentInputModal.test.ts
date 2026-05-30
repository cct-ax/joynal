import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { CommentWithCommenter } from '#shared/types/api'
import type { CommentInputModalExposed } from '#shared/types/components'
import CommentInputModal from './CommentInputModal.vue'

// useToast はテスト環境では UI に出ないので、呼び出しを spy する
const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

/** wrapper.vm から defineExpose の API を取り出す helper（キャストはここに集約） */
const exposedOf = (w: VueWrapper): CommentInputModalExposed =>
  w.vm as unknown as CommentInputModalExposed

// 月曜起点の週（2026-05-25 月 〜 2026-05-29 金）
const weekStart = new Date(2026, 4, 25)

const existingComment: CommentWithCommenter = {
  id: 'comment-1',
  trainee_id: 'trainee-1',
  commenter_id: 'mentor-1',
  week_start: '2026-05-25',
  content: '今週はよく頑張りました',
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z',
  commenter: { name: '佐藤 指導', role: 'mentor' }
}

describe('CommentInputModal', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    toastAddMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    // teleport 先（document.body）の DOM をテスト間で隔離する
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('open=true・新規モードで「週次コメントを入力」と週ラベルが表示される', async () => {
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: null
      }
    })
    expect(document.body.textContent).toContain('週次コメントを入力')
    expect(document.body.textContent).toContain('2026/5/25（月）〜 5/29（金）')
  })

  it('open=true・編集モードで「週次コメントを編集」と既存本文が表示される', async () => {
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: existingComment
      }
    })
    expect(document.body.textContent).toContain('週次コメントを編集')
    const textarea = document.body.querySelector('textarea')
    expect(textarea?.value).toBe('今週はよく頑張りました')
  })

  it('open=false ではフォームが表示されない', async () => {
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: false,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: null
      }
    })
    expect(document.body.textContent).not.toContain('週次コメントを入力')
  })

  it('submit で PUT /api/comments を weekStart/traineeId/content で呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce(null)
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: null
      }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ content: '来週も頑張りましょう' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/comments', {
      method: 'PUT',
      body: {
        weekStart: '2026-05-25',
        traineeId: 'trainee-1',
        content: '来週も頑張りましょう'
      }
    })
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'コメントを保存しました', color: 'success' })
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
    // 成功時はモーダルを閉じる（update:open=false を emit）
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('編集モードでも PUT /api/comments を呼ぶ（commenter は送らない）', async () => {
    fetchMock.mockResolvedValueOnce(null)
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'ojt',
        existing: existingComment
      }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ content: '更新後のコメント' })

    expect(fetchMock).toHaveBeenCalledWith('/api/comments', {
      method: 'PUT',
      body: {
        weekStart: '2026-05-25',
        traineeId: 'trainee-1',
        content: '更新後のコメント'
      }
    })
  })

  it('403 エラーで専用トーストを出し saved は emit しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 403 })
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: null
      }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ content: 'コメント' })

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'アクセス権限がありません', color: 'error' })
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('失敗時は fallback の error トーストを出し success は出さない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    wrapper = await mountSuspended(CommentInputModal, {
      props: {
        open: true,
        weekStart,
        traineeId: 'trainee-1',
        targetRole: 'mentor',
        existing: null
      }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({ content: 'コメント' })

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'コメントの保存に失敗しました', color: 'error' })
    )
    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    )
  })
})
