import { serverSupabaseClient } from '#supabase/server'
import type { AssignmentForAdmin, AssignmentForMentor } from '#shared/types/api'
import { assignmentsMeQuerySchema, uuidSchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['assignments'],
    summary: '担当新人一覧取得',
    description:
      'メンター・OJT は自分の担当新人、管理者は全新人の割り当て情報を取得する。新人ロールは 403。レスポンス形状はロールにより異なる（メンター・OJT は trainee のみ、管理者は mentor / ojt も含む）。',
    parameters: [
      {
        in: 'query',
        name: 'year',
        required: false,
        schema: { type: 'integer' },
        description: '年度（省略時は現在年度）'
      }
    ],
    responses: {
      200: {
        description: '担当新人一覧（メンター・OJT 視点 / 管理者視点のいずれか）',
        content: {
          'application/json': {
            example: {
              'メンター・OJT の場合': [
                { trainee_id: 'uuid', year: 2026, trainee: { name: '山田 花子', employee_id: 'E001' } }
              ],
              '管理者の場合': [
                {
                  trainee_id: 'uuid',
                  mentor_id: 'uuid',
                  ojt_id: 'uuid',
                  year: 2026,
                  trainee: { name: '山田 花子' },
                  mentor: { name: '田中 一郎' },
                  ojt: { name: '佐藤 美咲' }
                }
              ]
            }
          }
        }
      },
      401: { description: '未ログイン' },
      403: { description: '新人ロールが呼び出した' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * GET /api/assignments/me — 自分の担当新人一覧を返す（trainee は 403）。
 * admin は全割り当てを AssignmentForAdmin[]、mentor/ojt は自分が担当する新人のみ AssignmentForMentor[] で返す。
 */
export default defineEventHandler<Promise<AssignmentForAdmin[] | AssignmentForMentor[]>>(async (event) => {
  const userId = await serverUserId(event)

  // 防御的検証: userId は検証済み JWT の sub だが、後段の mentor/ojt 経路で PostgREST の
  // .or() フィルタに文字列補間する。UUID 形状なら PostgREST のメタ文字（, . ( ) :）を
  // 含み得ないため補間が安全になる。万一形状が壊れていれば未認証として弾く。
  if (!uuidSchema.safeParse(userId).success) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const { year: yearInput } = parseQuery(event, assignmentsMeQuerySchema)
  const year = resolveYear(yearInput)

  const client = await serverSupabaseClient(event)
  const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', userId).single()

  if (profileError) {
    throwSupabaseError(profileError, 'api/assignments/me GET profile fetch')
  }

  if (profile.role === 'trainee') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  if (profile.role === 'admin') {
    const { data, error } = await client
      .from('mentor_assignments')
      .select(
        `
        trainee_id,
        mentor_id,
        ojt_id,
        year,
        trainee:profiles!mentor_assignments_trainee_id_fkey(name),
        mentor:profiles!mentor_assignments_mentor_id_fkey(name),
        ojt:profiles!mentor_assignments_ojt_id_fkey(name)
      `
      )
      .eq('year', year)
      .overrideTypes<AssignmentForAdmin[], { merge: false }>()

    if (error) {
      throwSupabaseError(error, 'api/assignments/me GET admin query')
    }

    return data
  }

  const { data, error } = await client
    .from('mentor_assignments')
    .select(
      `
      trainee_id,
      year,
      trainee:profiles!mentor_assignments_trainee_id_fkey(name, employee_id)
    `
    )
    .or(`mentor_id.eq.${userId},ojt_id.eq.${userId}`)
    .eq('year', year)
    .overrideTypes<AssignmentForMentor[], { merge: false }>()

  if (error) {
    throwSupabaseError(error, 'api/assignments/me GET mentor query')
  }

  return data
})
