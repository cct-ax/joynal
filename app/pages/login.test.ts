import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
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
  const fetchMock = vi.fn()

  beforeEach(() => {
    toastAddMock.mockReset()
    notifyMock.mockReset()
    navigateToMock.mockReset()
    fetchMock.mockReset()
    routeQuery = {}
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
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
  })

  it('ログイン成功で POST /api/auth/login を呼び /report へ external 遷移する', async () => {
    fetchMock.mockResolvedValueOnce(undefined)
    wrapper = await mountSuspended(Login)

    await wrapper.find('input[type="email"]').setValue('taro@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'taro@example.com', password: 'password123' }
    })
    expect(navigateToMock).toHaveBeenCalledWith('/report', { external: true })
  })

  it('401 で notify を呼び /report へ遷移しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401 })
    wrapper = await mountSuspended(Login)

    await wrapper.find('input[type="email"]').setValue('taro@example.com')
    await wrapper.find('input[type="password"]').setValue('wrongpass')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusMessages: { 401: 'メールアドレスまたはパスワードが正しくありません' },
        fallback: 'ログインに失敗しました'
      })
    )
    expect(navigateToMock).not.toHaveBeenCalledWith('/report', { external: true })
  })
})
