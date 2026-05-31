import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { ResetPasswordPageExposed } from '#shared/types/components'
import ResetPassword from './reset-password.vue'

const notifyMock = vi.fn()
mockNuxtImport('useApiError', () => () => ({ notify: notifyMock }))

const navigateToMock = vi.fn()
// factory は hoist されるため、navigateToMock は呼び出し時に遅延参照する（直接返すと初期化前アクセスになる）
mockNuxtImport('navigateTo', () => (...args: unknown[]) => navigateToMock(...args))

/** wrapper.vm から defineExpose の API を取り出す helper */
const exposedOf = (w: VueWrapper): ResetPasswordPageExposed =>
  w.vm as unknown as ResetPasswordPageExposed

describe('reset-password ページ', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    notifyMock.mockReset()
    navigateToMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('初期表示で全フィールドと送信・更新ボタンが同時に出る', async () => {
    wrapper = await mountSuspended(ResetPassword)
    const text = wrapper.text()
    expect(text).toContain('メールアドレス')
    expect(text).toContain('確認コード')
    expect(text).toContain('新しいパスワード')
    expect(text).toContain('送信')
    expect(text).toContain('パスワードを更新')
  })

  it('requestCode 成功で POST /api/auth/reset-password を呼び送信済みヒントを出す', async () => {
    fetchMock.mockResolvedValueOnce(undefined)
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).requestCode({ email: 'taro@example.com' })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      body: { email: 'taro@example.com' }
    })
    expect(wrapper.text()).toContain('確認コードを送信しました')
    // 送信後はボタン文言が「再送」になる
    expect(wrapper.text()).toContain('再送')
  })

  it('requestCode で email 不正なら $fetch を呼ばずフィールドにインラインエラーを表示する', async () => {
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).requestCode({ email: '' })
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('有効なメールアドレスを入力してください')
  })

  it('送信後にメールアドレスを変更すると送信済みヒントが消える', async () => {
    fetchMock.mockResolvedValueOnce(undefined)
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).requestCode({ email: 'taro@example.com' })
    await flushPromises()
    expect(wrapper.text()).toContain('確認コードを送信しました')

    await wrapper.find('input[type="email"]').setValue('other@example.com')
    await flushPromises()

    expect(wrapper.text()).not.toContain('確認コードを送信しました')
  })

  it('requestCode 404 で notify を呼ぶ', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 404 })
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).requestCode({ email: 'unknown@example.com' })

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusMessages: { 404: 'このメールアドレスは登録されていません' },
        fallback: 'メールの送信に失敗しました'
      })
    )
  })

  it('submitNewPassword 成功で OTP 検証 API を confirm 抜きで呼び /login?reset=success へ external 遷移する', async () => {
    fetchMock.mockResolvedValueOnce(undefined)
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).submitNewPassword({
      email: 'taro@example.com',
      token: '123456',
      password: 'newpassword',
      confirm: 'newpassword'
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password-otp', {
      method: 'POST',
      body: { email: 'taro@example.com', token: '123456', password: 'newpassword' }
    })
    expect(navigateToMock).toHaveBeenCalledWith('/login?reset=success', { external: true })
  })

  it('submitNewPassword 400 で notify を呼びフォームが残る', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 400 })
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).submitNewPassword({
      email: 'taro@example.com',
      token: '000000',
      password: 'newpassword',
      confirm: 'newpassword'
    })
    await flushPromises()

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusMessages: { 400: 'コードが正しくないか期限切れです。再度お試しください' },
        fallback: 'パスワードの更新に失敗しました'
      })
    )
    // フォームが残り遷移しない
    expect(wrapper.text()).toContain('パスワードを更新')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('submitNewPassword が SAME_PASSWORD のとき専用メッセージで notify し遷移しない', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { code: 'SAME_PASSWORD' } })
    wrapper = await mountSuspended(ResetPassword)

    await exposedOf(wrapper).submitNewPassword({
      email: 'taro@example.com',
      token: '123456',
      password: 'samepass1',
      confirm: 'samepass1'
    })
    await flushPromises()

    expect(notifyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        codeMessages: { SAME_PASSWORD: '新しいパスワードは現在のパスワードと異なるものを設定してください' }
      })
    )
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
