import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { DailyReport } from '#shared/types/models'
import ReportRow from './ReportRow.vue'

const sampleReport: DailyReport = {
  id: 'rep-1',
  user_id: 'user-1',
  date: '2026-05-25',
  check_in: '09:00',
  check_out: '18:00',
  content: 'やったこと',
  mood: 4,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z'
}

describe('ReportRow', () => {
  const date = new Date(2026, 4, 25)

  it('新人ロール・未入力ではペンアイコンを表示', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: null, role: 'trainee' }
    })
    // 操作ボタンが存在する
    const editBtn = wrapper.find('button[aria-label="日報を入力"]')
    expect(editBtn.exists()).toBe(true)
  })

  it('新人ロール・未入力でクリックすると inputReport を emit する', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: null, role: 'trainee' }
    })
    const btn = wrapper.find('button[aria-label="日報を入力"]')
    await btn.trigger('click')
    const emitted = wrapper.emitted('inputReport')
    expect(emitted).toBeTruthy()
    expect((emitted![0]![0] as Date).getDate()).toBe(25)
  })

  it('新人ロール・入力済みでクリックすると editReport を emit する', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: sampleReport, role: 'trainee' }
    })
    const btn = wrapper.find('button[aria-label="日報を編集"]')
    await btn.trigger('click')
    const emitted = wrapper.emitted('editReport')
    expect(emitted).toBeTruthy()
    expect((emitted![0]![0] as DailyReport).id).toBe('rep-1')
  })

  it('メンターロール・入力済みでは展開ボタンが表示される', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: sampleReport, role: 'mentor' }
    })
    const btn = wrapper.find('button[aria-label="詳細を開く"]')
    expect(btn.exists()).toBe(true)
  })

  it('メンターロール・展開ボタンクリックで toggleDetail を emit する', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: sampleReport, role: 'mentor' }
    })
    const btn = wrapper.find('button[aria-label="詳細を開く"]')
    await btn.trigger('click')
    expect(wrapper.emitted('toggleDetail')).toBeTruthy()
  })

  it('メンターロール・未入力ではボタンが表示されない', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: { date, report: null, role: 'mentor' }
    })
    expect(wrapper.find('button[aria-label="日報を入力"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="詳細を開く"]').exists()).toBe(false)
  })

  it('isExpanded=true で詳細が表示される', async () => {
    const wrapper = await mountSuspended(ReportRow, {
      props: {
        date,
        report: sampleReport,
        role: 'mentor',
        isExpanded: true
      }
    })
    expect(wrapper.text()).toContain('やったこと')
    expect(wrapper.find('button[aria-label="詳細を閉じる"]').exists()).toBe(true)
  })

  it('入力済みは80字 truncate される', async () => {
    const longContent = 'あ'.repeat(100)
    const wrapper = await mountSuspended(ReportRow, {
      props: {
        date,
        report: { ...sampleReport, content: longContent },
        role: 'trainee'
      }
    })
    // PC レイアウト側に「あ」×80 + 「…」が含まれる
    expect(wrapper.text()).toContain('あ'.repeat(80) + '…')
  })
})
