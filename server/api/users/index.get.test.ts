import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './index.get'

const eventStub = {} as Parameters<typeof handler>[0]

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'caller-1' } as never)
  })

  it('非管理者は 403（管理者ガード）', async () => {
    vi.mocked(serverSupabaseClient).mockResolvedValue(
      createSupabaseClientMock({ data: { role: 'trainee' }, error: null }).client as never
    )
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('管理者は service role 経由で email 付き一覧を返す', async () => {
    // 呼び出し元ロール確認（user client）→ admin
    vi.mocked(serverSupabaseClient).mockResolvedValue(
      createSupabaseClientMock({ data: { role: 'admin' }, error: null }).client as never
    )
    // 一覧取得（service role）
    const users = [{ id: 'u1', employee_id: 'E001', name: 'A', email: 'a@joynal.test', role: 'trainee' }]
    vi.mocked(serverSupabaseServiceRole).mockReturnValue(
      createSupabaseClientMock({ data: users, error: null }).client as never
    )

    const result = await handler(eventStub)
    expect(result).toEqual(users)
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    vi.mocked(serverSupabaseClient).mockResolvedValue(
      createSupabaseClientMock({ data: null, error: null }).client as never
    )
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })
})
