import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { ReportInputModalExposed } from '#shared/types/components'
import ReportInputModal from './ReportInputModal.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

const exposedOf = (wrapper: VueWrapper): ReportInputModalExposed =>
  wrapper.vm as unknown as ReportInputModalExposed

const validReport = {
  date: '2026-06-24',
  check_in: '09:00',
  check_out: '18:00',
  content: '日報保存APIを実装',
  mood: 4 as const
}

describe('ReportInputModal', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    toastAddMock.mockReset()
    notifyMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('新規日報を POST /api/reports で保存する', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: validReport.date, report: null }
    })

    await exposedOf(wrapper).submit(validReport)

    expect(fetchMock).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      body: validReport
    })
    expect(toastAddMock).toHaveBeenCalledWith({
      title: '日報を保存しました',
      color: 'success'
    })
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })

  it('mood 未入力時は body に mood を含めない', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: validReport.date, report: null }
    })

    await exposedOf(wrapper).submit({
      date: validReport.date,
      check_in: validReport.check_in,
      check_out: validReport.check_out,
      content: validReport.content
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      body: {
        date: validReport.date,
        check_in: validReport.check_in,
        check_out: validReport.check_out,
        content: validReport.content
      }
    })
  })

  it('保存成功後にフォームをリセットする', async () => {
    fetchMock.mockResolvedValueOnce({})
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: validReport.date, report: null }
    })
    const textarea = document.querySelector('textarea')
    expect(textarea).not.toBeNull()
    if (!textarea) {
      return
    }
    textarea.value = '入力途中の内容'
    textarea.dispatchEvent(new Event('input'))

    await exposedOf(wrapper).submit(validReport)

    expect(textarea.value).toBe('')
  })

  it('409 エラーは useApiError で重複メッセージを通知する', async () => {
    const error = { statusCode: 409 }
    fetchMock.mockRejectedValueOnce(error)
    wrapper = await mountSuspended(ReportInputModal, {
      props: { open: true, date: validReport.date, report: null }
    })

    await exposedOf(wrapper).submit(validReport)

    expect(notifyMock).toHaveBeenCalledWith(error, {
      statusMessages: { 409: '同じ日付の日報がすでに存在します' },
      fallback: '保存に失敗しました'
    })
    expect(toastAddMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
