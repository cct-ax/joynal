import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AiSummaryPanel from './AiSummaryPanel.vue'

const summary = { content: 'サマリー本文', audience: 'self' as const, sourceUpdatedAt: '2026-05-18T00:00:00Z' }

describe('AiSummaryPanel', () => {
  it('summary があれば本文と「再生成」を表示する', async () => {
    const wrapper = await mountSuspended(AiSummaryPanel, {
      props: { summary, stale: false, generating: false }
    })
    expect(wrapper.text()).toContain('サマリー本文')
    expect(wrapper.text()).toContain('再生成')
    wrapper.unmount()
  })

  it('summary が null なら未生成メッセージと「生成」を表示する', async () => {
    const wrapper = await mountSuspended(AiSummaryPanel, {
      props: { summary: null, stale: false, generating: false }
    })
    expect(wrapper.text()).toContain('まだサマリーがありません')
    expect(wrapper.text()).toContain('生成')
    wrapper.unmount()
  })

  it('生成中は streamingContent をライブ表示し summary 本文は出さない', async () => {
    const wrapper = await mountSuspended(AiSummaryPanel, {
      props: { summary, stale: false, generating: true, streamingContent: '生成中の途中経過' }
    })
    expect(wrapper.text()).toContain('生成中の途中経過')
    expect(wrapper.text()).not.toContain('サマリー本文')
    wrapper.unmount()
  })

  it('stale なら更新バッジを表示する', async () => {
    const wrapper = await mountSuspended(AiSummaryPanel, {
      props: { summary, stale: true, generating: false }
    })
    expect(wrapper.text()).toContain('内容が更新されています')
    wrapper.unmount()
  })

  it('ボタンクリックで generate を emit する', async () => {
    const wrapper = await mountSuspended(AiSummaryPanel, {
      props: { summary, stale: false, generating: false }
    })
    const btn = wrapper.findAll('button').find(b => b.text().includes('再生成'))
    await btn?.trigger('click')
    expect(wrapper.emitted('generate')).toBeTruthy()
    wrapper.unmount()
  })
})
