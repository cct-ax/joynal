import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { CommentWithCommenter } from '#shared/types/api'
import CommentArea from './CommentArea.vue'

const mentorComment: CommentWithCommenter = {
  id: 'c-1',
  week_start: '2026-05-25',
  trainee_id: 'trainee-1',
  commenter_id: 'mentor-1',
  content: '今週もよく頑張りましたね',
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z',
  commenter: { name: '田中 一郎', role: 'mentor' }
}

describe('CommentArea', () => {
  const weekStart = new Date(2026, 4, 25)

  it('「週次コメント」見出しを表示する', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment: null,
        ojtComment: null,
        role: 'trainee'
      }
    })
    expect(wrapper.text()).toContain('週次コメント')
  })

  it('未入力の場合「コメントはまだありません」と表示', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment: null,
        ojtComment: null,
        role: 'trainee'
      }
    })
    // 2 つ表示される（メンター / OJT）
    const occurrences = wrapper.text().match(/コメントはまだありません/g)
    expect(occurrences?.length).toBe(2)
  })

  it('コメントがあれば本文とコメンター名を表示する', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment,
        ojtComment: null,
        role: 'trainee'
      }
    })
    expect(wrapper.text()).toContain('今週もよく頑張りましたね')
    expect(wrapper.text()).toContain('田中 一郎')
  })

  it('role=mentor では「編集」ボタンが表示される', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment,
        ojtComment: null,
        role: 'mentor'
      }
    })
    expect(wrapper.text()).toContain('編集')
  })

  it('role=mentor・コメント未入力では「入力」ボタンが表示される', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment: null,
        ojtComment: null,
        role: 'mentor'
      }
    })
    expect(wrapper.text()).toContain('入力')
  })

  it('role=trainee では編集ボタンが表示されない', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment,
        ojtComment: null,
        role: 'trainee'
      }
    })
    expect(wrapper.text()).not.toContain('編集')
  })

  it('編集ボタンクリックで editComment を emit する', async () => {
    const wrapper = await mountSuspended(CommentArea, {
      props: {
        weekStart,
        mentorComment,
        ojtComment: null,
        role: 'mentor'
      }
    })
    const editBtn = wrapper.findAll('button').find(b => b.text() === '編集')
    await editBtn!.trigger('click')
    const emitted = wrapper.emitted('editComment')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual(['mentor'])
  })
})
