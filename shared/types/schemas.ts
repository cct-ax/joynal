import { z } from 'zod'
import type { MoodValue } from '#shared/types/api'

/**
 * 気分（mood）の値域 1〜5 を表す Zod union。
 * shared/types/api.ts の MoodValue / MOOD_VALUES と整合させる単一ソースとして定義し、
 * 本ファイル内（reportSchema / reportUpdateBodySchema）で再利用する。
 *
 * NOTE: MOOD_VALUES からの動的派生は Zod の `z.union` がタプル長を型で要求するため
 * `as` キャストが発生する。`satisfies z.ZodType<MoodValue>` で値域との同期は静的に検証する。
 */
const moodUnion = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]) satisfies z.ZodType<MoodValue>

const moodSchema = moodUnion.optional() satisfies z.ZodType<MoodValue | undefined>

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
    mood: moodSchema
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

/**
 * パスワードリセット（OTP方式）の「コード＋新パスワード設定」フォーム用スキーマ。
 * メールで届いた6桁コードと新パスワードを受け取る。現在のパスワードは不要。
 */
export const resetWithOtpSchema = z
  .object({
    email: z.email('有効なメールアドレスを入力してください'),
    token: z.string().regex(/^\d{6}$/, '6桁のコードを入力してください'),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirm: z.string().min(1, '確認用パスワードを入力してください')
  })
  .refine(v => v.password === v.confirm, {
    path: ['confirm'],
    message: 'パスワードが一致しません'
  })

export const userCreateSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.email('有効なメールアドレスを入力してください'),
  role: z.enum(['trainee', 'mentor', 'ojt', 'admin'] as const, {
    error: 'ロールを選択してください'
  })
})

export const assignmentSchema = z.object({
  traineeId: z.guid('有効なユーザーIDを指定してください'),
  mentorId: z.guid().nullable(),
  ojtId: z.guid().nullable(),
  year: z.number().int().optional()
})

// ----------------------------------------------------------------
// サーバー API 用スキーマ（query / body / route param）
// フロントの reportSchema 等とは別に、ネットワーク境界で使う「unknown を絞り込む」ためのスキーマ
// ----------------------------------------------------------------

/**
 * ID 検証は z.uuid()（RFC 4122 のバージョン/variant まで厳密）ではなく z.guid()（UUID 形状のみ）を使う。
 * 認証ユーザー由来の不透明な ID を「形だけ」検証する目的で、バージョン nibble は問わない。
 * （z.uuid() は version=0 のテスト用 ID 等を弾いて 400 になる。最終的に Postgres + RLS でも検証される）
 */
export const uuidSchema = z.guid('有効な ID を指定してください')

const ymdRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

/** GET /api/reports クエリ */
export const reportsQuerySchema = z.object({
  weekStart: z
    .string()
    .regex(ymdRegex, 'weekStart は YYYY-MM-DD 形式で指定してください'),
  userId: z.guid().optional()
})

/** POST /api/reports ボディ。フロントの reportSchema と同じルール + サーバーでも mood 範囲を強制 */
export const reportCreateBodySchema = z
  .object({
    date: z.string().regex(ymdRegex, 'date は YYYY-MM-DD 形式で指定してください'),
    check_in: z.string().regex(timeRegex, 'check_in は HH:MM 形式で指定してください'),
    check_out: z.string().regex(timeRegex, 'check_out は HH:MM 形式で指定してください'),
    content: z.string().min(1, 'content は必須です'),
    mood: moodSchema
  })
  .refine(v => v.check_out > v.check_in, {
    path: ['check_out'],
    message: 'check_out は check_in より後の時刻を指定してください'
  })

/** PUT /api/reports/[id] ボディ。すべて optional、両方存在時のみ refine */
export const reportUpdateBodySchema = z
  .object({
    check_in: z.string().regex(timeRegex).optional(),
    check_out: z.string().regex(timeRegex).optional(),
    content: z.string().min(1).optional(),
    mood: moodUnion.nullable().optional()
  })
  .refine(v => !v.check_in || !v.check_out || v.check_out > v.check_in, {
    path: ['check_out'],
    message: 'check_out は check_in より後の時刻を指定してください'
  })

/** GET /api/comments クエリ */
export const commentsQuerySchema = z.object({
  weekStart: z.string().regex(ymdRegex),
  traineeId: z.guid()
})

/** PUT /api/comments ボディ */
export const commentUpsertBodySchema = z.object({
  weekStart: z.string().regex(ymdRegex),
  traineeId: z.guid(),
  content: z.string().min(1, 'content は必須です')
})

/** GET /api/assignments/me クエリ。year は URL 上では文字列で来るので coerce で数値化 */
export const assignmentsMeQuerySchema = z.object({
  year: z.coerce.number().int().optional()
})

/** PUT /api/assignments ボディ */
export const assignmentUpsertBodySchema = z.object({
  traineeId: z.guid(),
  mentorId: z.guid().nullable(),
  ojtId: z.guid().nullable(),
  year: z.number().int().optional()
})

/** POST /api/users ボディ */
export const userCreateBodySchema = z.object({
  name: z.string().min(1, 'name は必須です').max(255),
  email: z.email('有効なメールアドレスを指定してください'),
  role: z.enum(['trainee', 'mentor', 'ojt', 'admin'] as const)
})

/** PUT /api/users/[id] ボディ */
export const userUpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.email().optional(),
  role: z.enum(['trainee', 'mentor', 'ojt', 'admin'] as const).optional(),
  is_active: z.boolean().optional()
})

/** POST /api/auth/update-password ボディ。新パスワードのみ受け取る（current/confirm はフォーム UX 用） */
export const updatePasswordBodySchema = z.object({
  password: z.string().min(8, 'パスワードは8文字以上で入力してください')
})

/** POST /api/auth/reset-password-otp ボディ。recovery OTP の検証＋新パスワード反映に使う */
export const resetPasswordOtpBodySchema = z.object({
  email: z.email('有効なメールアドレスを指定してください'),
  token: z.string().regex(/^\d{6}$/, '6桁のコードを指定してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください')
})

// ----------------------------------------------------------------
// 型の導出
// ----------------------------------------------------------------

export type ReportSchema = z.output<typeof reportSchema>
export type CommentSchema = z.output<typeof commentSchema>
export type LoginSchema = z.output<typeof loginSchema>
export type ResetPasswordSchema = z.output<typeof resetPasswordSchema>
export type PasswordChangeSchema = z.output<typeof passwordChangeSchema>
export type ResetWithOtpSchema = z.output<typeof resetWithOtpSchema>
export type UserCreateSchema = z.output<typeof userCreateSchema>
export type AssignmentSchema = z.output<typeof assignmentSchema>
