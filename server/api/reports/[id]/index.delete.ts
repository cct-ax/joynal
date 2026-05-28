import { serverSupabaseClient } from '#supabase/server'
import { uuidSchema } from '#shared/types/schemas'

export default defineEventHandler(async (event) => {
  await serverUserId(event)

  const id = parseRouteParam(event, 'id', uuidSchema)

  const client = await serverSupabaseClient(event)
  const { error, count } = await client
    .from('daily_reports')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
    }
    console.error('[api/reports/:id DELETE]', error)
    throw createError({ statusCode: 500, message: 'サーバーエラーが発生しました' })
  }

  if (count === 0) {
    throw createError({ statusCode: 404, message: '日報が見つかりません' })
  }

  setResponseStatus(event, 204)
  return null
})
