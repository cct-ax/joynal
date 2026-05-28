import { vi } from 'vitest'
import { serverUserId } from '../utils/auth'
import { parseBody, parseQuery, parseRouteParam } from '../utils/validate'

/**
 * server ハンドラのユニットテスト用グローバル提供。
 *
 * vitest の nuxt(app) 環境には Nitro のサーバー auto-import が無いため、ハンドラが参照する
 * `defineEventHandler` や server/utils の auto-import（serverUserId / parseBody 等）を
 * ここでグローバルに用意する。`#supabase/server` は vitest.config の resolve.alias で
 * スタブ化されているので、serverUserId は実物のまま（内部の serverSupabaseUser のみモック）。
 *
 * 各テストファイルでハンドラを import する**前**に副作用 import する:
 *   import '../../test/serverGlobals'
 *   import handler from './index.post'
 *
 * h3 の I/O 系（readBody / getQuery / getRouterParam / setResponseStatus / getRequestURL）は
 * 入力制御のため各テストの beforeEach で vi.stubGlobal する。createError は @nuxt/test-utils 提供。
 */
vi.stubGlobal('defineEventHandler', <T>(handler: T): T => handler)
vi.stubGlobal('serverUserId', serverUserId)
vi.stubGlobal('parseBody', parseBody)
vi.stubGlobal('parseQuery', parseQuery)
vi.stubGlobal('parseRouteParam', parseRouteParam)
