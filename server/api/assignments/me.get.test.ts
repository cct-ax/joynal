import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { QueryResult } from '../../test/supabaseMock'
import '../../test/serverGlobals'
import handler from './me.get'

const getQueryMock = vi.fn()
const eventStub = {} as Parameters<typeof handler>[0]

const userId = '00000000-0000-4000-8000-0000000000aa'

/**
 * ハンドラは同一 client で profiles（ロール確認 → .single()）と
 * mentor_assignments（一覧 → .overrideTypes() で thenable await）を順に叩くため、
 * テーブルごとに別のクエリビルダ（別 result）を返すマルチテーブルモックを用意する。
 */
const chainMethods = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'or', 'in', 'is',
  'order', 'limit', 'range', 'returns', 'overrideTypes'
] as const

type QueryMock = Record<typeof chainMethods[number] | 'single' | 'maybeSingle', ReturnType<typeof vi.fn>> & {
  then: (onFulfilled: (r: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) => Promise<unknown>
}

const createQuery = (result: QueryResult): QueryMock => {
  const query = {} as QueryMock
  for (const m of chainMethods) query[m] = vi.fn(() => query)
  query.single = vi.fn(() => Promise.resolve(result))
  query.maybeSingle = vi.fn(() => Promise.resolve(result))
  query.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)
  return query
}

const mockClient = (results: Record<string, QueryResult>) => {
  const queries: Record<string, QueryMock> = {}
  for (const [table, result] of Object.entries(results)) queries[table] = createQuery(result)
  const from = vi.fn((table: string) => queries[table])
  vi.mocked(serverSupabaseClient).mockResolvedValue({ from } as never)
  // noUncheckedIndexedAccess 下で undefined を伴わずにテーブル別ビルダを取り出すアクセサ。
  const q = (table: string): QueryMock => {
    const found = queries[table]
    if (!found) throw new Error(`no mock query for table: ${table}`)
    return found
  }
  return { from, queries, q }
}

describe('GET /api/assignments/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getQuery', getQueryMock)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: userId } as never)
    getQueryMock.mockReturnValue({ year: '2026' })
  })

  it('未認証は 401', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as never)
    mockClient({ profiles: { data: { role: 'admin' }, error: null } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('sub が UUID 形状でない場合は 401（profiles を引く前に弾く）', async () => {
    vi.mocked(serverSupabaseUser).mockResolvedValue({ sub: 'not-a-uuid' } as never)
    const { from } = mockClient({ profiles: { data: { role: 'admin' }, error: null } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 401 })
    expect(from).not.toHaveBeenCalled()
  })

  it('プロフィール取得エラーは 500', async () => {
    mockClient({ profiles: { data: null, error: { message: 'boom' } } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('trainee ロールは 403', async () => {
    const { from, q } = mockClient({ profiles: { data: { role: 'trainee' }, error: null } })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 403 })
    expect(q('profiles').eq).toHaveBeenCalledWith('id', userId)
    // ロール確認で 403 にする前に assignments を引いていないこと（早期リターンの保証）
    expect(from).not.toHaveBeenCalledWith('mentor_assignments')
  })

  it('admin ロールは admin select で year により絞り込んで返す（or は使わない）', async () => {
    const adminRows = [
      { trainee_id: 't1', mentor_id: 'm1', ojt_id: null, year: 2026, trainee: { name: '新人' }, mentor: { name: 'メンター' }, ojt: null }
    ]
    const { from, q } = mockClient({
      profiles: { data: { role: 'admin' }, error: null },
      mentor_assignments: { data: adminRows, error: null }
    })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('mentor_assignments')
    const selectArg = vi.mocked(q('mentor_assignments').select).mock.calls[0]?.[0] as string
    expect(selectArg).toContain('mentor_id')
    expect(selectArg).toContain('ojt_id')
    expect(selectArg).toContain('mentor:profiles!mentor_assignments_mentor_id_fkey(name)')
    expect(q('mentor_assignments').eq).toHaveBeenCalledWith('year', 2026)
    expect(q('mentor_assignments').or).not.toHaveBeenCalled()
    expect(result).toEqual(adminRows)
  })

  it('mentor ロールは mentor select + or(mentor_id/ojt_id) で絞り込んで返す', async () => {
    const mentorRows = [
      { trainee_id: 't1', year: 2026, trainee: { name: '新人', employee_id: 'E001' } }
    ]
    const { from, q } = mockClient({
      profiles: { data: { role: 'mentor' }, error: null },
      mentor_assignments: { data: mentorRows, error: null }
    })

    const result = await handler(eventStub)

    expect(from).toHaveBeenCalledWith('mentor_assignments')
    const selectArg = vi.mocked(q('mentor_assignments').select).mock.calls[0]?.[0] as string
    expect(selectArg).toContain('employee_id')
    expect(selectArg).not.toContain('mentor_id')
    expect(q('mentor_assignments').or).toHaveBeenCalledWith(`mentor_id.eq.${userId},ojt_id.eq.${userId}`)
    expect(q('mentor_assignments').eq).toHaveBeenCalledWith('year', 2026)
    expect(result).toEqual(mentorRows)
  })

  it('ojt ロールも mentor select 経路を辿る', async () => {
    const ojtRows = [
      { trainee_id: 't2', year: 2026, trainee: { name: '新人2', employee_id: 'E002' } }
    ]
    const { q } = mockClient({
      profiles: { data: { role: 'ojt' }, error: null },
      mentor_assignments: { data: ojtRows, error: null }
    })

    const result = await handler(eventStub)

    expect(q('mentor_assignments').or).toHaveBeenCalledWith(`mentor_id.eq.${userId},ojt_id.eq.${userId}`)
    expect(result).toEqual(ojtRows)
  })

  it('admin の mentor_assignments クエリエラーは 500', async () => {
    mockClient({
      profiles: { data: { role: 'admin' }, error: null },
      mentor_assignments: { data: null, error: { message: 'boom' } }
    })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('mentor の mentor_assignments クエリエラーは 500', async () => {
    mockClient({
      profiles: { data: { role: 'mentor' }, error: null },
      mentor_assignments: { data: null, error: { message: 'boom' } }
    })
    await expect(handler(eventStub)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('year 未指定なら現在年で絞り込む', async () => {
    getQueryMock.mockReturnValue({})
    const currentYear = new Date().getFullYear()
    const { q } = mockClient({
      profiles: { data: { role: 'admin' }, error: null },
      mentor_assignments: { data: [], error: null }
    })

    await handler(eventStub)

    expect(q('mentor_assignments').eq).toHaveBeenCalledWith('year', currentYear)
  })
})
