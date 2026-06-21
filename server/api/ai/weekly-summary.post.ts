import { serverSupabaseClient } from '#supabase/server'
import type { WeeklySummaryData } from '#shared/types/api'
import { weeklySummaryBodySchema } from '#shared/types/schemas'
import { buildWeeklySummaryUserMessage, deriveAudience, systemPromptFor, weekRange } from '../../utils/aiWeeklySummary'

defineRouteMeta({
  openAPI: {
    tags: ['ai'],
    summary: '週次サマリー生成 / 再生成',
    description:
      'その週の日報から週次サマリーを生成し ai_summaries に upsert する。'
      + 'audience はサーバー導出（self＝本人・mentor＝担当メンター/OJT/管理者）。日報が無ければ 422。',
    requestBody: {
      content: {
        'application/json': {
          example: { userId: '00000000-0000-4000-8000-0000000000bb', weekStart: '2026-05-18' }
        }
      }
    },
    responses: {
      200: { description: '生成結果（content / audience / sourceUpdatedAt）' },
      400: { description: '不正なボディ' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人を指定（RLS による）' },
      422: { description: 'その週に日報が無く生成できない' },
      502: { description: 'AI 上流エラー / 応答が空' }
    }
  }
})

/**
 * POST /api/ai/weekly-summary — その週の日報から週次サマリーを生成し upsert する。
 * audience はサーバーが導出し、可視範囲・書き込み可否は RLS に委譲する。
 */
export default defineEventHandler<Promise<WeeklySummaryData>>(async (event) => {
  const requesterId = await serverUserId(event)
  const { userId, weekStart } = await parseBody(event, weeklySummaryBodySchema)
  const audience = deriveAudience(userId, requesterId)

  const client = await serverSupabaseClient(event)

  // その週の日報（RLS で担当外は 0 件）
  const { from, to } = weekRange(weekStart)
  const { data: reports, error: reportError } = await client
    .from('daily_reports')
    .select('date, content, mood, updated_at')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (reportError) {
    throwSupabaseError(reportError, 'api/ai/weekly-summary POST reports')
  }

  if (!reports || reports.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      data: { message: 'この週には日報がないため、サマリーを生成できません', code: 'NO_REPORTS' }
    })
  }

  // 生成時点のその週の日報 max(updated_at)（鮮度判定の基準）
  const sourceUpdatedAt = reports.map(r => r.updated_at).reduce((max, u) => (u > max ? u : max))

  const text = await aiChat(event, {
    system: systemPromptFor(audience),
    user: buildWeeklySummaryUserMessage(
      reports.map(r => ({ date: r.date, content: r.content, mood: r.mood }))
    )
  })
  const content = text.trim()
  if (!content) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      data: { message: 'AI 応答を取得できませんでした。再度お試しください', code: 'AI_UPSTREAM_ERROR' }
    })
  }

  // 1 ユーザー・1 週・1 audience につき 1 行を upsert（RLS で担当外は 42501→403）
  const { error: upsertError } = await client
    .from('ai_summaries')
    .upsert(
      { user_id: userId, week_start: weekStart, audience, content, source_updated_at: sourceUpdatedAt },
      { onConflict: 'user_id,week_start,audience' }
    )

  if (upsertError) {
    throwSupabaseError(upsertError, 'api/ai/weekly-summary POST upsert')
  }

  return { content, audience, sourceUpdatedAt }
})
