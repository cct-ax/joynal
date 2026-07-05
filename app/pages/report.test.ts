import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import ReportPage from './report.vue'

const refreshReportsMock = vi.fn()
const useFetchMock = vi.fn()
mockNuxtImport('useFetch', () => (...args: unknown[]) => useFetchMock(...args))

describe('report ページ', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    refreshReportsMock.mockReset()
    useFetchMock.mockReset()
    useFetchMock.mockReturnValue({
      data: ref([]),
      refresh: refreshReportsMock
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('日報保存後に一覧を再取得する', async () => {
    wrapper = await mountSuspended(ReportPage, {
      global: {
        stubs: {
          ReportInputModal: {
            template: '<button data-testid="saved" @click="$emit(\'saved\')">saved</button>'
          }
        }
      }
    })

    await wrapper.get('[data-testid="saved"]').trigger('click')
    await flushPromises()

    expect(useFetchMock).toHaveBeenCalledWith(
      '/api/reports',
      expect.objectContaining({
        query: expect.anything(),
        default: expect.any(Function)
      }),
      expect.any(String)
    )
    expect(refreshReportsMock).toHaveBeenCalledTimes(1)
  })
})
