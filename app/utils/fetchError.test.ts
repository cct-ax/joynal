import { describe, expect, it } from 'vitest'
import { getFetchMessage, getFetchStatus, isFetchError } from './fetchError'

describe('isFetchError', () => {
  it('statusCode を持つオブジェクトを true', () => {
    expect(isFetchError({ statusCode: 400 })).toBe(true)
    expect(isFetchError({ statusCode: 409, data: { message: 'x' } })).toBe(true)
  })

  it('statusCode が数値でないなら false', () => {
    expect(isFetchError({ statusCode: '400' })).toBe(false)
    expect(isFetchError({ statusCode: null })).toBe(false)
  })

  it('null / undefined / プリミティブは false', () => {
    expect(isFetchError(null)).toBe(false)
    expect(isFetchError(undefined)).toBe(false)
    expect(isFetchError('error')).toBe(false)
    expect(isFetchError(404)).toBe(false)
  })

  it('Error インスタンス（statusCode なし）は false', () => {
    expect(isFetchError(new Error('boom'))).toBe(false)
  })
})

describe('getFetchStatus', () => {
  it('FetchError から statusCode を返す', () => {
    expect(getFetchStatus({ statusCode: 409 })).toBe(409)
  })

  it('FetchError でなければ null', () => {
    expect(getFetchStatus(null)).toBeNull()
    expect(getFetchStatus(new Error())).toBeNull()
    expect(getFetchStatus({})).toBeNull()
  })
})

describe('getFetchMessage', () => {
  it('data.message が string なら返す', () => {
    expect(getFetchMessage({ statusCode: 400, data: { message: '不正です' } })).toBe('不正です')
  })

  it('data.message が無い場合は null', () => {
    expect(getFetchMessage({ statusCode: 400 })).toBeNull()
    expect(getFetchMessage({ statusCode: 400, data: {} })).toBeNull()
  })

  it('data.message が string でないなら null', () => {
    expect(getFetchMessage({ statusCode: 400, data: { message: 123 } })).toBeNull()
  })

  it('FetchError でなければ null', () => {
    expect(getFetchMessage(null)).toBeNull()
    expect(getFetchMessage('error')).toBeNull()
  })
})
