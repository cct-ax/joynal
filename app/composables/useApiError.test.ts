import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

describe('useApiError', () => {
  beforeEach(() => {
    toastAddMock.mockReset()
  })

  it('statusMessages にマッチする statusCode は専用メッセージを出す', () => {
    const apiError = useApiError()
    apiError.notify(
      { statusCode: 409 },
      { statusMessages: { 409: '重複しています' }, fallback: 'fallback' }
    )
    expect(toastAddMock).toHaveBeenCalledWith({
      title: '重複しています',
      color: 'error'
    })
  })

  it('400 + data.message はサーバーメッセージを優先', () => {
    const apiError = useApiError()
    apiError.notify(
      { statusCode: 400, data: { message: '日付が不正です' } },
      { fallback: '保存に失敗' }
    )
    expect(toastAddMock).toHaveBeenCalledWith({
      title: '日付が不正です',
      color: 'error'
    })
  })

  it('400 でも preferServerMessageOn400=false なら fallback', () => {
    const apiError = useApiError()
    apiError.notify(
      { statusCode: 400, data: { message: '無視されます' } },
      { fallback: 'fallback メッセージ', preferServerMessageOn400: false }
    )
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'fallback メッセージ',
      color: 'error'
    })
  })

  it('未知のエラーは fallback', () => {
    const apiError = useApiError()
    apiError.notify(new Error('network'), { fallback: 'fallback' })
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'fallback',
      color: 'error'
    })
  })

  it('statusMessages に存在しない statusCode は fallback', () => {
    const apiError = useApiError()
    apiError.notify(
      { statusCode: 500 },
      { statusMessages: { 409: 'x' }, fallback: 'fallback' }
    )
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'fallback',
      color: 'error'
    })
  })
})
