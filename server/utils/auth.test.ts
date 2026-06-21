import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createSupabaseClientMock } from '../test/supabaseMock'
import { assertAdminRole, serverUserId } from './auth'

// serverSupabaseUser の戻り型（JwtPayload | null）を #supabase/server 由来で導出する。
type Claims = Awaited<ReturnType<typeof serverSupabaseUser>>
const eventStub = {} as Parameters<typeof serverUserId>[0]
const asClaims = (v: unknown): Claims => v as Claims

describe('serverUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('JWT claims の sub をユーザー ID として返す', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(asClaims({ sub: 'user-1' }))
    await expect(serverUserId(eventStub)).resolves.toBe('user-1')
  })

  it('未認証（null）は 401 を throw', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(asClaims(null))
    await expect(serverUserId(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('claims に sub が無ければ 401（id ではなく sub を見ていることの担保）', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(asClaims({ id: 'wrong-field' }))
    await expect(serverUserId(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('assertAdminRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 既定は認証済み。role はテスト毎に serverSupabaseClient のモックで差し替える。
    vi.mocked(serverSupabaseUser).mockResolvedValue(asClaims({ sub: 'caller-1' }))
  })

  it('管理者なら userId を返す', async () => {
    vi.mocked(serverSupabaseClient).mockResolvedValue(
      createSupabaseClientMock({ data: { role: 'admin' }, error: null }).client as never
    )
    await expect(assertAdminRole(eventStub)).resolves.toBe('caller-1')
  })

  it('非管理者は 403 を throw', async () => {
    vi.mocked(serverSupabaseClient).mockResolvedValue(
      createSupabaseClientMock({ data: { role: 'trainee' }, error: null }).client as never
    )
    await expect(assertAdminRole(eventStub)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('未認証は 403 に達する前に 401 を throw', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(asClaims(null))
    await expect(assertAdminRole(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })
})
