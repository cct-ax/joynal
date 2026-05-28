import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthError } from '@supabase/supabase-js'

const toastAddMock = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const fakeError = { message: 'Invalid login' } as AuthError

describe('useSupabaseAuthError', () => {
  beforeEach(() => {
    toastAddMock.mockReset()
  })

  it('title のみで toast を出す（既定）', () => {
    const authError = useSupabaseAuthError()
    authError.notify(fakeError, { title: 'ログイン失敗' })
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'ログイン失敗',
      color: 'error'
    })
  })

  it('showDescription=true なら error.message を description に乗せる', () => {
    const authError = useSupabaseAuthError()
    authError.notify(fakeError, { title: 'ログイン失敗', showDescription: true })
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'ログイン失敗',
      description: 'Invalid login',
      color: 'error'
    })
  })
})
