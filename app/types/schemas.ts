import { z } from 'zod'

/**
 * 日報フォーム用スキーマ。
 * - check_out > check_in を refine で検証する。
 * - mood は任意項目（1〜5）。
 */
export const reportSchema = z
  .object({
    date: z.string().min(1, '日付は必須です'),
    check_in: z.string().min(1, '出勤時間は必須です'),
    check_out: z.string().min(1, '退勤時間は必須です'),
    content: z.string().min(1, 'やったことは必須です'),
    mood: z.number().int().min(1).max(5).optional()
  })
  .refine(v => !v.check_in || !v.check_out || v.check_out > v.check_in, {
    path: ['check_out'],
    message: '退勤時間は出勤時間より後を指定してください'
  })

/**
 * 週次コメント用スキーマ。
 */
export const commentSchema = z.object({
  content: z.string().min(1, 'コメントは必須です')
})

/**
 * ログインフォーム用スキーマ。
 */
export const loginSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードは必須です')
})

/**
 * パスワードリセット申請フォーム用スキーマ。
 */
export const resetPasswordSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください')
})

/**
 * パスワード変更フォーム用スキーマ。
 * - 新しいパスワードと確認用が一致することを refine で検証する。
 */
export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, '現在のパスワードを入力してください'),
    next: z.string().min(8, '新しいパスワードは8文字以上で入力してください'),
    confirm: z.string().min(1, '確認用パスワードを入力してください')
  })
  .refine(v => v.next === v.confirm, {
    path: ['confirm'],
    message: '新しいパスワードと確認用パスワードが一致しません'
  })

export const userCreateSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.email('有効なメールアドレスを入力してください'),
  role: z.enum(['trainee', 'mentor', 'ojt', 'admin'] as const, {
    error: 'ロールを選択してください'
  })
})

export const userUpdateSchema = userCreateSchema.partial().extend({
  is_active: z.boolean().optional()
})

export const assignmentSchema = z.object({
  traineeId: z.uuid('有効なユーザーIDを指定してください'),
  mentorId: z.uuid().nullable(),
  ojtId: z.uuid().nullable(),
  year: z.number().int().optional()
})

export type ReportSchema = z.output<typeof reportSchema>
export type CommentSchema = z.output<typeof commentSchema>
export type LoginSchema = z.output<typeof loginSchema>
export type ResetPasswordSchema = z.output<typeof resetPasswordSchema>
export type PasswordChangeSchema = z.output<typeof passwordChangeSchema>
export type UserCreateSchema = z.output<typeof userCreateSchema>
export type UserUpdateSchema = z.output<typeof userUpdateSchema>
export type AssignmentSchema = z.output<typeof assignmentSchema>
