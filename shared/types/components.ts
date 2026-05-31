/**
 * コンポーネントの defineExpose で公開する API 型を集約する。
 *
 * - Props / Emits は各 SFC 内に inline で書く方針（読みやすさ重視、PL 方針）
 * - 共通値型（MoodValue 等）は `shared/types/api.ts` から import する
 * - 本ファイルは defineExpose の型のみ。テストから型推論で参照する目的
 */
import type {
  CommentSchema,
  PasswordChangeSchema,
  ReportSchema,
  ResetPasswordSchema,
  ResetWithOtpSchema,
  UserCreateSchema
} from '#shared/types/schemas'

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

/**
 * UserFormModal が defineExpose で公開する API（招待 POST・編集 PUT 兼用）。
 * テストから submit を直接呼ぶ際に使用する。
 */
export type UserFormModalExposed = {
  submit: (data: UserCreateSchema) => Promise<void>
}

/**
 * reset-password ページが defineExpose で公開する API（OTP方式の2ステップ）。
 * テストから各 step の submit を直接呼ぶ際に使用する。
 */
export type ResetPasswordPageExposed = {
  requestCode: (data: ResetPasswordSchema) => Promise<void>
  submitNewPassword: (data: ResetWithOtpSchema) => Promise<void>
}
