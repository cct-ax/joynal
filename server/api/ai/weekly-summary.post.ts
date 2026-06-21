import { serverSupabaseClient } from '#supabase/server'
import type { WeeklySummaryDoneData, WeeklySummaryErrorData } from '#shared/types/api'
import { weeklySummaryBodySchema } from '#shared/types/schemas'
import { buildWeeklySummaryUserMessage, deriveAudience, systemPromptFor, weekRange } from '../../utils/aiWeeklySummary'

defineRouteMeta({
  openAPI: {
    tags: ['ai'],
    summary: '週次サマリー生成 / 再生成（SSE ストリーミング）',
    description:
      'その週の日報から週次サマリーを生成し、生成トークンを SSE（text/event-stream）で逐次配信して '
      + '完了時に ai_summaries へ upsert する。イベント: delta（差分テキスト）/ done（完了メタ）/ error（AI 上流失敗）。'
      + '認証・バリデーション・日報なし(422)・レート上限(429) は SSE 開始前に通常の HTTP ステータスで返す。'
      + 'audience はサーバー導出（self＝本人・mentor＝担当メンター/OJT/管理者）。',
    requestBody: {
      content: {
        'application/json': {
          example: { userId: '00000000-0000-4000-8000-0000000000bb', weekStart: '2026-05-18' }
        }
      }
    },
    responses: {
      200: { description: 'SSE ストリーム（delta / done / error イベント）' },
      400: { description: '不正なボディ' },
      401: { description: '未ログイン' },
      403: { description: '担当外の新人を指定（RLS による）' },
      422: { description: 'その週に日報が無く生成できない' },
      429: { description: '当日の AI 利用上限を超過' }
    }
  }
})

/**
 * POST /api/ai/weekly-summary — その週の日報から週次サマリーを生成し SSE で逐次配信する。
 *
 * 事前チェック（認証・ボディ・日報なし・レート上限）はストリーム開始前に行い、正しい HTTP
 * ステータスで返す。HTTP 200（SSE 開始）以降の AI 上流失敗は `error` イベントで通知する。
 * audience はサーバーが導出し、可視範囲・書き込み可否は RLS に委譲する。
 */
export default defineEventHandler(async (event) => {
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

  // 当日の AI 利用上限を確認＆記録（超過は 429）。日報が無い場合(422)は手前で弾くので消費しない。
  await assertWithinDailyLimit(event, requesterId)

  // ここから SSE（HTTP 200 確定）。以降のエラーは HTTP ステータスでは返せないため error イベントで通知する。
  const stream = createEventStream(event)
  const { provider, model, stream: deltas } = aiChatStream(event, {
    system: systemPromptFor(audience),
    user: buildWeeklySummaryUserMessage(
      reports.map(r => ({ date: r.date, content: r.content, mood: r.mood }))
    )
  })

  // クライアント切断を検知したら生成を打ち切る（無駄な AI 消費・閉じたストリームへの push を避ける）
  let clientGone = false
  stream.onClosed(() => {
    clientGone = true
  })

  // 閉じたストリームへの push / close は無視する（unhandled rejection 防止）
  const safePush = async (message: { event: string, data: string }): Promise<void> => {
    try {
      await stream.push(message)
    } catch {
      clientGone = true
    }
  }
  const pushError = (payload: WeeklySummaryErrorData): Promise<void> =>
    safePush({ event: 'error', data: JSON.stringify(payload) })

  // 生成タスク（return stream.send() 後も SSE が開いている間バックグラウンドで走り続ける）
  const pump = async (): Promise<void> => {
    let accumulated = ''
    try {
      for await (const delta of deltas) {
        if (clientGone) break
        accumulated += delta
        await safePush({ event: 'delta', data: JSON.stringify({ text: delta }) })
      }

      // 切断時は途中までの生成を保存しない（部分結果を残さない）
      if (clientGone) return

      const content = accumulated.trim()
      if (!content) {
        await pushError({ message: 'AI 応答を取得できませんでした。再度お試しください', code: 'AI_UPSTREAM_ERROR' })
        return
      }

      // 1 ユーザー・1 週・1 audience につき 1 行を upsert（RLS で担当外は 42501）
      const { error: upsertError } = await client
        .from('ai_summaries')
        .upsert(
          { user_id: userId, week_start: weekStart, audience, content, source_updated_at: sourceUpdatedAt, model, provider },
          { onConflict: 'user_id,week_start,audience' }
        )
      if (upsertError) {
        console.error('[weekly-summary] upsert failed:', upsertError.code)
        await pushError({ message: '生成結果の保存に失敗しました', code: 'DB_ERROR' })
        return
      }

      const done: WeeklySummaryDoneData = { audience, sourceUpdatedAt }
      await safePush({ event: 'done', data: JSON.stringify(done) })
    } catch (error) {
      console.error('[weekly-summary] stream failed:', error)
      await pushError({ message: 'AI 応答の取得に失敗しました。時間をおいて再度お試しください', code: 'AI_UPSTREAM_ERROR' })
    } finally {
      try {
        await stream.close()
      } catch {
        // 既に閉じている（クライアント切断）場合は無視
      }
    }
  }

  void pump()
  return stream.send()
})
