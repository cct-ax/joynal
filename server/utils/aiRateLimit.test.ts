import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseClientMock, type QueryResult } from '../test/supabaseMock'
import '../test/serverGlobals'
import { checkAndIncrementUsage } from './aiRateLimit'

const userId = '00000000-0000-4000-8000-0000000000aa'
const today = '2026-06-21'

const setup = (result: QueryResult) => createSupabaseClientMock(result)

describe('checkAndIncrementUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('上限未満なら count を +1 で upsert する', async () => {
    const { client, from, query } = setup({ data: { count: 3 }, error: null })

    await checkAndIncrementUsage(client as never, userId, 50, today)

    expect(from).toHaveBeenCalledWith('ai_usage')
    expect(query.upsert).toHaveBeenCalledWith(
      { user_id: userId, usage_date: today, count: 4 },
      { onConflict: 'user_id,usage_date' }
    )
  })

  it('レコードが無ければ count=1 で作成する', async () => {
    const { client, query } = setup({ data: null, error: null })

    await checkAndIncrementUsage(client as never, userId, 50, today)

    expect(query.upsert).toHaveBeenCalledWith(
      { user_id: userId, usage_date: today, count: 1 },
      { onConflict: 'user_id,usage_date' }
    )
  })

  it('上限到達なら 429 で upsert しない', async () => {
    const { client, query } = setup({ data: { count: 50 }, error: null })

    await expect(checkAndIncrementUsage(client as never, userId, 50, today))
      .rejects.toMatchObject({ statusCode: 429, data: { code: 'AI_RATE_LIMIT' } })
    expect(query.upsert).not.toHaveBeenCalled()
  })

  it('select の RLS 拒否(42501)は 403', async () => {
    const { client } = setup({ data: null, error: { code: '42501' } })

    await expect(checkAndIncrementUsage(client as never, userId, 50, today))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})
