/**
 * server/utils/supabaseError.ts のテスト。
 *
 * throwSupabaseError は PostgrestError を H3Error に変換して必ず throw する。
 * 3 分岐を検証する:
 * (a) overrides[code] が最優先（PG_DEFAULTS より優先）
 * (b) PG_DEFAULTS にヒット（42501→403 / PGRST116→404）
 * (c) どちらも無し→500 で console.error を呼ぶ
 *
 * createError は Nitro の auto-import。throw された H3Error の statusCode / statusMessage / data を検証する。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PostgrestError } from '@supabase/supabase-js'
import { throwSupabaseError } from './supabaseError'

const makeError = (code: string): PostgrestError =>
  new PostgrestError({ message: 'db error', details: '', hint: '', code })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('throwSupabaseError', () => {
  it('(a) overrides[code] を最優先で使う（PG_DEFAULTS より優先）', () => {
    const error = makeError('42501')
    try {
      throwSupabaseError(error, 'api/test', {
        42501: { statusCode: 409, message: 'カスタム文言' }
      })
      expect.fail('throw されるべき')
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 409, message: 'カスタム文言' })
    }
  })

  it('(a) overrides に statusMessage / data 構造付きを渡せる', () => {
    const error = makeError('23505')
    try {
      throwSupabaseError(error, 'api/test', {
        23505: {
          statusCode: 409,
          statusMessage: 'Conflict',
          data: { message: 'この社員IDは既に使用されています', code: 'EMPLOYEE_ID_TAKEN' }
        }
      })
      expect.fail('throw されるべき')
    } catch (e) {
      expect(e).toMatchObject({
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { message: 'この社員IDは既に使用されています', code: 'EMPLOYEE_ID_TAKEN' }
      })
    }
  })

  it('(b) PG_DEFAULTS: 42501 は 403「アクセス権限がありません」', () => {
    const error = makeError('42501')
    try {
      throwSupabaseError(error, 'api/test')
      expect.fail('throw されるべき')
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 403, message: 'アクセス権限がありません' })
    }
  })

  it('(b) PG_DEFAULTS: PGRST116 は 404「リソースが見つかりません」', () => {
    const error = makeError('PGRST116')
    try {
      throwSupabaseError(error, 'api/test')
      expect.fail('throw されるべき')
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 404, message: 'リソースが見つかりません' })
    }
  })

  it('(c) 未知のコードは 500 を throw し console.error を呼ぶ', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = makeError('XX999')
    try {
      throwSupabaseError(error, 'api/test GET')
      expect.fail('throw されるべき')
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 500, message: 'サーバーエラーが発生しました' })
    }
    expect(consoleSpy).toHaveBeenCalledWith('[api/test GET]', error)
  })
})
