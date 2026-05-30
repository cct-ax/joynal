/**
 * コンポーネントの defineExpose で公開する API 型を集約する。
 *
 * - Props / Emits は各 SFC 内に inline で書く方針（読みやすさ重視、PL 方針）
 * - 共通値型（MoodValue 等）は `shared/types/api.ts` から import する
 * - 本ファイルは defineExpose の型のみ。テストから型推論で参照する目的
 */
import type { CommentSchema, PasswordChangeSchema, ReportSchema } from '#shared/types/schemas'

/**
 * ReportInputModal が defineExpose で公開する API。
 * テストから submit / onDelete を直接呼ぶ際に使用する。
 */
export type ReportInputModalExposed = {
  submit: (data: ReportSchema) => Promise<void>
  onDelete: () => Promise<void>
}

/**
 * PasswordChangeModal が defineExpose で公開する API。
 * テストから submit を直接呼ぶ際に使用する。
 */
export type PasswordChangeModalExposed = {
  submit: (data: PasswordChangeSchema) => Promise<void>
}

/**
 * CommentInputModal が defineExpose で公開する API。
 * テストから submit を直接呼ぶ際に使用する。
 */
export type CommentInputModalExposed = {
  submit: (data: CommentSchema) => Promise<void>
}
