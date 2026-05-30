import type { H3Event } from 'h3'
import type { z } from 'zod'

/**
 * Zod スキーマでサーバー側入力を検証するための共通ヘルパー。
 *
 * - readBody / getQuery / getRouterParam の戻り値（unknown）を安全に絞り込む
 * - 失敗時は 400 を throw し、エラーレスポンスは `{ data: { message, code, details } }` 構造に統一
 * - フロント側の useApiError がそのまま拾える形式
 */

export type ValidationErrorDetail = {
  path: (string | number)[]
  message: string
}

export type ValidationErrorPayload = {
  message: string
  code: 'VALIDATION_ERROR'
  details: ValidationErrorDetail[]
}

const toDetails = (issues: z.core.$ZodIssue[]): ValidationErrorDetail[] =>
  issues.map(i => ({ path: i.path as (string | number)[], message: i.message }))

const throwValidationError = (errors: ValidationErrorDetail[]): never => {
  throw createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    data: {
      message: errors[0]?.message ?? '入力内容に誤りがあります',
      code: 'VALIDATION_ERROR',
      details: errors
    } satisfies ValidationErrorPayload
  })
}

/**
 * リクエストボディを Zod スキーマで検証する。
 * 失敗時は 400 を throw。
 */
export const parseBody = async <T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): Promise<z.output<T>> => {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) return throwValidationError(toDetails(result.error.issues))
  return result.data
}

/**
 * クエリパラメータを Zod スキーマで検証する。
 * 失敗時は 400 を throw。
 */
export const parseQuery = <T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): z.output<T> => {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) return throwValidationError(toDetails(result.error.issues))
  return result.data
}

/**
 * ルートパラメータを Zod スキーマで検証する。
 * 失敗時は 400 を throw。
 */
export const parseRouteParam = <T extends z.ZodTypeAny>(
  event: H3Event,
  name: string,
  schema: T
): z.output<T> => {
  const value = getRouterParam(event, name)
  const result = schema.safeParse(value)
  if (!result.success) return throwValidationError(toDetails(result.error.issues))
  return result.data
}
