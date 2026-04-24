import { z } from 'zod'

export const reportSchema = z.object({
  date: z.string().min(1, '日付は必須です'),
  check_in: z.string().min(1, '出勤時間は必須です'),
  check_out: z.string().min(1, '退勤時間は必須です'),
  content: z.string().min(1, 'やったことは必須です'),
  mood: z.number().int().min(1).max(5).optional()
})

export const commentSchema = z.object({
  content: z.string().min(1, 'コメントは必須です')
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
export type UserCreateSchema = z.output<typeof userCreateSchema>
export type UserUpdateSchema = z.output<typeof userUpdateSchema>
export type AssignmentSchema = z.output<typeof assignmentSchema>
