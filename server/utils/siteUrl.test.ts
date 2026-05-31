import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveSiteBaseUrl } from './siteUrl'

const getRequestURLMock = vi.fn()
const eventStub = {} as Parameters<typeof resolveSiteBaseUrl>[0]

describe('resolveSiteBaseUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getRequestURL は server-only auto-import（free identifier）なので global stub で制御する。
    vi.stubGlobal('getRequestURL', getRequestURLMock)
    getRequestURLMock.mockReturnValue(new URL('https://req.example.com/api/auth/reset-password'))
  })

  it('siteUrl 未設定（既定 ""）ならリクエスト origin にフォールバックする', () => {
    // useRuntimeConfig は nuxt.config の既定 runtimeConfig.public.siteUrl='' を返す。
    expect(resolveSiteBaseUrl(eventStub)).toBe('https://req.example.com')
  })
})
