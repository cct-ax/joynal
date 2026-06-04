/**
 * server/utils/validate.ts のテスト。
 *
 * Nitro の `createError` は auto-import のため stubGlobal で差し替えできない。
 * ここでは「成功 → data を返す / 失敗 → throw する」の挙動のみ検証する。
 * エラー構造（code: 'VALIDATION_ERROR'、details）の検証は E2E / 統合テストで行う想定。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { parseBody, parseQuery, parseRouteParam } from './validate'

const readBodyMock = vi.fn()
const getQueryMock = vi.fn()
const getRouterParamMock = vi.fn()

beforeEach(() => {
  readBodyMock.mockReset()
  getQueryMock.mockReset()
  getRouterParamMock.mockReset()
  vi.stubGlobal('readBody', readBodyMock)
  vi.stubGlobal('getQuery', getQueryMock)
  vi.stubGlobal('getRouterParam', getRouterParamMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const sampleSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0)
})

const eventStub = {} as Parameters<typeof parseBody>[0]

describe('parseBody', () => {
  it('有効な body は parse 結果を返す', async () => {
    readBodyMock.mockResolvedValueOnce({ name: 'Yamada', age: 30 })
    const data = await parseBody(eventStub, sampleSchema)
    expect(data).toEqual({ name: 'Yamada', age: 30 })
  })

  it('不正な body は throw する', async () => {
    readBodyMock.mockResolvedValueOnce({ name: '', age: -1 })
    await expect(parseBody(eventStub, sampleSchema)).rejects.toThrow()
  })

  it('型不一致でも throw する（age が string）', async () => {
    readBodyMock.mockResolvedValueOnce({ name: 'X', age: 'bad' })
    await expect(parseBody(eventStub, sampleSchema)).rejects.toThrow()
  })
})

describe('parseQuery', () => {
  it('有効なクエリは parse 結果を返す', () => {
    getQueryMock.mockReturnValueOnce({ name: 'X', age: 1 })
    const data = parseQuery(eventStub, sampleSchema)
    expect(data).toEqual({ name: 'X', age: 1 })
  })

  it('不正なクエリは throw', () => {
    getQueryMock.mockReturnValueOnce({ name: '', age: 'bad' })
    expect(() => parseQuery(eventStub, sampleSchema)).toThrow()
  })
})

describe('parseRouteParam', () => {
  const uuidSchema = z.uuid()

  it('有効な UUID v4 はそのまま返す', () => {
    const validUuid = '00000000-0000-4000-8000-000000000001'
    getRouterParamMock.mockReturnValueOnce(validUuid)
    expect(parseRouteParam(eventStub, 'id', uuidSchema)).toBe(validUuid)
  })

  it('UUID でない値は throw', () => {
    getRouterParamMock.mockReturnValueOnce('not-uuid')
    expect(() => parseRouteParam(eventStub, 'id', uuidSchema)).toThrow()
  })

  it('undefined（ルートパラメータ未指定）は throw', () => {
    getRouterParamMock.mockReturnValueOnce(undefined)
    expect(() => parseRouteParam(eventStub, 'id', uuidSchema)).toThrow()
  })
})
