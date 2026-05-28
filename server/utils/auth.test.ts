import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { JwtPayload } from '@supabase/supabase-js'
import { serverSupabaseUser } from '#supabase/server'
import { serverUserId } from './auth'

const eventStub = {} as Parameters<typeof serverUserId>[0]
const asClaims = (v: unknown): JwtPayload | null => v as JwtPayload | null

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
