import type { AiCoachResponse } from '#shared/types/api'
import { aiCoachBodySchema } from '#shared/types/schemas'
import { COACH_SYSTEM_PROMPT, buildCoachUserMessage, parseCoachResponse } from '../../utils/aiCoach'

defineRouteMeta({
  openAPI: {
    tags: ['ai'],
    summary: '新人コーチング（振り返りの深掘り質問＋短評）',
    description:
      '入力中の日報ドラフトと気分から、振り返りを深める質問2〜3個と短い励ましを返す。'
      + '日報の代筆はしない（質問と短評のみ）。主に新人向けだが全ロールが利用可能。',
    requestBody: {
      content: {
        'application/json': {
          example: { content: '今日は API を実装した。テストで詰まった。', mood: 3 }
        }
      }
    },
    responses: {
      200: {
        description: '質問と短評',
        content: {
          'application/json': {
            example: {
              questions: ['テストで詰まった原因は何だと思う？', '次に同じ場面で試したいことは？'],
              feedback: '原因を言語化できている点がいいですね。'
            }
          }
        }
      },
      400: { description: 'content が長すぎる等の不正入力' },
      401: { description: '未ログイン' },
      502: { description: 'AI 上流エラー / 応答を解釈できない' }
    }
  }
})

/**
 * POST /api/ai/coach — 入力中の日報に対する振り返りコーチング。
 * 質問＋短評のみを返し、本文の代筆はしない（プロンプトと出力構造の二重で担保）。
 */
export default defineEventHandler<Promise<AiCoachResponse>>(async (event) => {
  // 認証ゲート（未認証は 401）。コーチングは個人の入力支援なので追加の認可は不要。
  const requesterId = await serverUserId(event)

  const { content, mood } = await parseBody(event, aiCoachBodySchema)

  // 当日の AI 利用上限を確認＆記録（超過は 429）。AI を呼ぶ直前に行う。
  await assertWithinDailyLimit(event, requesterId)

  const { text } = await aiChat(event, {
    system: COACH_SYSTEM_PROMPT,
    user: buildCoachUserMessage(content, mood)
  })

  const parsed = parseCoachResponse(text)
  if (!parsed) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      data: { message: 'AI 応答を解釈できませんでした。再度お試しください', code: 'AI_UPSTREAM_ERROR' }
    })
  }
  return parsed
})
