import { vi } from 'vitest'

/**
 * `#supabase/server` のテスト用スタブ。
 * vitest の nuxt(app) 環境では Nitro の `#supabase/server` を解決できないため、
 * `vitest.config.ts` の `resolve.alias` でこのファイルへ差し替える。
 * 各テストでは `vi.mocked(serverSupabaseUser).mockResolvedValue(...)` 等で戻り値を設定する。
 */
export const serverSupabaseClient = vi.fn()
export const serverSupabaseUser = vi.fn()
export const serverSupabaseServiceRole = vi.fn()
