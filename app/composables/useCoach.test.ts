import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { useCoach } from './useCoach'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

let wrapper: VueWrapper | null = null
const fetchMock = vi.fn()

const mountCoach = async () => {
  let exposed: ReturnType<typeof useCoach> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useCoach()
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useCoach>
}

describe('useCoach', () => {
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

  it('fetchHints: content/mood を body にして POST し hints をセット', async () => {
    const res = { questions: ['Q1', 'Q2'], feedback: 'いいね' }
    fetchMock.mockResolvedValueOnce(res)
    const { hints, pending, fetchHints } = await mountCoach()

    await fetchHints('ドラフト本文', 4)

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/coach', {
      method: 'POST',
      body: { content: 'ドラフト本文', mood: 4 }
    })
    expect(hints.value).toEqual(res)
    expect(pending.value).toBe(false)
  })

  it('空ドラフト・mood なしは body を空にして POST', async () => {
    fetchMock.mockResolvedValueOnce({ questions: ['Q'], feedback: '' })
    const { fetchHints } = await mountCoach()

    await fetchHints('   ', undefined)

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/coach', { method: 'POST', body: {} })
  })

  it('失敗時は error トーストを出し hints は null のまま', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 502 })
    const { hints, fetchHints } = await mountCoach()

    await fetchHints('x')

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(hints.value).toBeNull()
  })

  it('reset で hints を null に戻す', async () => {
    fetchMock.mockResolvedValueOnce({ questions: ['Q'], feedback: '' })
    const { hints, fetchHints, reset } = await mountCoach()
    await fetchHints('x')
    expect(hints.value).not.toBeNull()

    reset()

    expect(hints.value).toBeNull()
  })
})
