import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { DailyReport } from '#shared/types/models'
import type { ReportInputModalExposed } from '#shared/types/components'
import ReportInputModal from './ReportInputModal.vue'

// useToast はテスト環境では UI に出ないので、呼び出しを spy する
const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const sampleReport: DailyReport = {
  id: 'rep-1',
  user_id: 'user-1',
  date: '2026-05-25',
  check_in: '09:00',
  check_out: '18:00',
  content: '昨日の続き',
  mood: 4,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z'
}

/**
 * `wrapper.vm` から defineExpose の API を取り出す helper。
 * @vue/test-utils の VueWrapper.vm は ComponentPublicInstance のため、
 * defineExpose の型を引き当てるには 1 箇所だけキャストが必要。
 * テスト内の他の箇所では as を使わずに済むよう、ここに集約する。
 */
const exposedOf = (w: VueWrapper): ReportInputModalExposed =>
  w.vm as unknown as ReportInputModalExposed

describe('ReportInputModal', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    toastAddMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('open=true・新規モードで「日報を入力」と日付ラベルが表示される', async () => {
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: '2026-05-25', report: null }
    })
    expect(document.body.textContent).toContain('日報を入力')
    expect(document.body.textContent).toContain('2026/5/25')
  })

  it('open=true・編集モードで「日報を編集」と削除ボタンが表示される', async () => {
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: null, report: sampleReport }
    })
    expect(document.body.textContent).toContain('日報を編集')
    const deleteBtn = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent?.trim() === '削除'
    )
    expect(deleteBtn).toBeDefined()
  })

  it('新規モードの submit で POST /api/reports を呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: '2026-05-25', report: null }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({
      date: '2026-05-25',
      check_in: '09:00',
      check_out: '18:00',
      content: '実装作業',
      mood: 4
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      body: {
        date: '2026-05-25',
        check_in: '09:00',
        check_out: '18:00',
        content: '実装作業',
        mood: 4
      }
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('新規モード・mood なしでも POST する（mood キーは含まない）', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: '2026-05-25', report: null }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({
      date: '2026-05-25',
      check_in: '09:00',
      check_out: '18:00',
      content: '実装作業'
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      body: {
        date: '2026-05-25',
        check_in: '09:00',
        check_out: '18:00',
        content: '実装作業'
      }
    })
  })

  it('編集モードの submit で PUT /api/reports/:id を呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: null, report: sampleReport }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({
      date: '2026-05-25',
      check_in: '10:00',
      check_out: '19:00',
      content: '更新内容',
      mood: 5
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/reports/rep-1', {
      method: 'PUT',
      body: {
        check_in: '10:00',
        check_out: '19:00',
        content: '更新内容',
        mood: 5
      }
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('編集モードで onDelete を呼ぶと DELETE /api/reports/:id を呼ぶ', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: null, report: sampleReport }
    })
    const vm = exposedOf(wrapper)

    await vm.onDelete()

    expect(fetchMock).toHaveBeenCalledWith('/api/reports/rep-1', { method: 'DELETE' })
    expect(wrapper.emitted('deleted')).toBeTruthy()
  })

  it('409 エラーで専用トーストが追加される', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 409 })
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: '2026-05-25', report: null }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({
      date: '2026-05-25',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容'
    })

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '同じ日付の日報がすでに存在します',
        color: 'error'
      })
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('保存成功で success トーストが追加される', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: '2026-05-25', report: null }
    })
    const vm = exposedOf(wrapper)

    await vm.submit({
      date: '2026-05-25',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容'
    })

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '日報を保存しました',
        color: 'success'
      })
    )
  })
})
