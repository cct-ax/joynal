import { serverSupabaseClient } from '#supabase/server'
import { uuidSchema } from '#shared/types/schemas'

defineRouteMeta({
  openAPI: {
    tags: ['reports'],
    summary: '日報削除',
    description: '新人が自分の日報のみ削除できる（RLS で強制）。',
    responses: {
      204: { description: '成功（ボディなし）' },
      401: { description: '未ログイン' },
      403: { description: '他ユーザーの日報を削除しようとした（RLS による）' },
      404: { description: '対象の日報が存在しない' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/** DELETE /api/reports/:id — 日報を削除し 204 を返す。削除権限は RLS に委譲（権限不足は 403、対象不存在は 404）。 */
export default defineEventHandler(async (event) => {
  await serverUserId(event)

  const id = parseRouteParam(event, 'id', uuidSchema)

  const client = await serverSupabaseClient(event)
  const { error, count } = await client
    .from('daily_reports')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    throwSupabaseError(error, 'api/reports/:id DELETE')
  }

  if (count === 0) {
    throw createError({ statusCode: 404, message: '日報が見つかりません' })
  }

  setResponseStatus(event, 204)
  return null
})
