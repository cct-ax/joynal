import { serverSupabaseClient } from '#supabase/server'
import type { WeeklySummaryData, WeeklySummaryGetResponse } from '#shared/types/api'
import { weeklySummaryQuerySchema } from '#shared/types/schemas'
import { deriveAudience, weekRange } from '../../utils/aiWeeklySummary'

defineRouteMeta({
  openAPI: {
    tags: ['ai'],
    summary: '週次サマリー取得（キャッシュ）',
    description:
      'キャッシュ済みの週次サマリーと、鮮度判定用のその週の日報 max(updated_at) を返す。生成はしない。'
      + 'audience は対象 userId とリクエスト者からサーバーが導出（self/mentor）。範囲は RLS で強制。',
    parameters: [
      {
        in: 'query',
        name: 'userId',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '対象ユーザーID'
      },
      {
        in: 'query',
        name: 'weekStart',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: '週開始日（月曜・YYYY-MM-DD）'
      }
    ],
    responses: {
      200: { description: 'サマリー（未生成なら summary=null）＋その週の日報 max(updated_at)' },
      400: { description: '不正なクエリ' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人を指定（RLS による）' },
      500: { description: 'サーバーエラー' }
    }
  }
})

/**
 * GET /api/ai/weekly-summary — キャッシュ済みサマリー＋鮮度判定用の日報 max(updated_at)。
 * 生成はしない（再生成は POST）。可視範囲は RLS に委譲する。
 */
export default defineEventHandler<Promise<WeeklySummaryGetResponse>>(async (event) => {
  const requesterId = await serverUserId(event)
  const { userId, weekStart } = parseQuery(event, weeklySummaryQuerySchema)
  const audience = deriveAudience(userId, requesterId)

  const client = await serverSupabaseClient(event)

  // キャッシュ取得（RLS で担当外は 0 件＝null）
  const { data: cached, error: cacheError } = await client
    .from('ai_summaries')
    .select('content, source_updated_at')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('audience', audience)
    .maybeSingle()

  if (cacheError) {
    throwSupabaseError(cacheError, 'api/ai/weekly-summary GET cache')
  }

  // その週の日報 max(updated_at)（鮮度判定用）
  const { from, to } = weekRange(weekStart)
  const { data: latest, error: reportError } = await client
    .from('daily_reports')
    .select('updated_at')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (reportError) {
    throwSupabaseError(reportError, 'api/ai/weekly-summary GET reports')
  }

  const summary: WeeklySummaryData | null = cached
    ? { content: cached.content, audience, sourceUpdatedAt: cached.source_updated_at }
    : null

  return { summary, latestReportUpdatedAt: latest?.updated_at ?? null }
})
