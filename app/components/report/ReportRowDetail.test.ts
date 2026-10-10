import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { DailyReport } from '#shared/types/models'
import ReportRowDetail from './ReportRowDetail.vue'

const sampleReport: DailyReport = {
  id: 'rep-1',
  user_id: 'user-1',
  date: '2026-05-25',
  check_in: '09:00',
  check_out: '18:00',
  content: 'やったこと本文',
  mood: 4,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z'
}

describe('ReportRowDetail', () => {
  it('variant=pc・isOpen=true で本文とメタ行（出勤/退勤/気分）が表示される', async () => {
    const wrapper = await mountSuspended(ReportRowDetail, {
      props: { report: sampleReport, variant: 'pc', panelId: 'panel-pc', isOpen: true }
    })
    expect(wrapper.text()).toContain('やったこと本文')
    expect(wrapper.text()).toContain('出勤')
    expect(wrapper.text()).toContain('退勤')
    expect(wrapper.text()).toContain('気分')
  })

  it('variant=sp・isOpen=true は本文のみでメタ行は出ない', async () => {
    const wrapper = await mountSuspended(ReportRowDetail, {
      props: { report: sampleReport, variant: 'sp', panelId: 'panel-sp', isOpen: true }
    })
    expect(wrapper.text()).toContain('やったこと本文')
    expect(wrapper.text()).not.toContain('出勤')
    expect(wrapper.text()).not.toContain('退勤')
  })

  it('isOpen=false では何も表示されない', async () => {
    const wrapper = await mountSuspended(ReportRowDetail, {
      props: { report: sampleReport, variant: 'pc', panelId: 'panel-pc', isOpen: false }
    })
    expect(wrapper.text()).not.toContain('やったこと本文')
  })

  it('panelId が詳細パネルの id に反映される', async () => {
    const wrapper = await mountSuspended(ReportRowDetail, {
      props: { report: sampleReport, variant: 'pc', panelId: 'panel-xyz', isOpen: true }
    })
    expect(wrapper.find('#panel-xyz').exists()).toBe(true)
  })
})
