import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import Login from './login.vue'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

// route.query はテストごとに差し替える（factory は hoist されるので呼び出し時に遅延参照）
let routeQuery: Record<string, string> = {}
mockNuxtImport('useRoute', () => () => ({ query: routeQuery }))

// navigateTo は呼び出し時に遅延参照する（直接返すと hoist で初期化前アクセスになる）
const navigateToMock = vi.fn()
mockNuxtImport('navigateTo', () => (...args: unknown[]) => navigateToMock(...args))

describe('login ページ', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    toastAddMock.mockReset()
    navigateToMock.mockReset()
    routeQuery = {}
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('?reset=success で完了 toast を出し query を除去する', async () => {
    routeQuery = { reset: 'success' }
    wrapper = await mountSuspended(Login)

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'パスワードを更新しました。新しいパスワードでログインしてください。',
        color: 'success'
      })
    )
    expect(navigateToMock).toHaveBeenCalledWith({ path: '/login', query: {} }, { replace: true })
  })

  it('query が無いときは toast を出さない', async () => {
    wrapper = await mountSuspended(Login)

    expect(toastAddMock).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
