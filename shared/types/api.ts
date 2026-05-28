import type { Comment, Profile } from './models'

// ----------------------------------------------------------------
// Shared
// ----------------------------------------------------------------

export type UserRole = 'trainee' | 'mentor' | 'ojt' | 'admin'

export const VALID_ROLES: readonly UserRole[] = ['trainee', 'mentor', 'ojt', 'admin']

/**
 * 日報の気分（mood）の値域。
 * DB の CHECK 制約（1〜5）・Zod スキーマ・MoodStars コンポーネント・API ボディ型を統一する。
 * 値域を変える場合はこのタプルだけ更新すればよい（型・schema・UI 全てがここから派生）。
 * null は「未入力に戻す」操作（PUT で明示的に解除）を表す（型側で `MoodValue | null` として扱う）。
 */
export const MOOD_VALUES = [1, 2, 3, 4, 5] as const
export type MoodValue = typeof MOOD_VALUES[number]

/** DB の数値（number | null）等を MoodValue に絞り込む type guard */
export const isMoodValue = (v: unknown): v is MoodValue =>
  (MOOD_VALUES as readonly unknown[]).includes(v)

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------

export type ReportsQuery = {
  weekStart: string
  userId?: string
}

export type ReportCreateBody = {
  date: string
  check_in: string
  check_out: string
  content: string
  mood?: MoodValue
}

export type ReportUpdateBody = {
  check_in?: string
  check_out?: string
  content?: string
  mood?: MoodValue | null
}

// ----------------------------------------------------------------
// Comments
// ----------------------------------------------------------------

export type CommentsQuery = {
  weekStart: string
  traineeId: string
}

export type CommentUpsertBody = {
  weekStart: string
  traineeId: string
  content: string
}

export type CommentWithCommenter = Comment & {
  commenter: Pick<Profile, 'name' | 'role'>
}

// ----------------------------------------------------------------
// Assignments
// ----------------------------------------------------------------

export type AssignmentsMeQuery = {
  year?: string
}

export type AssignmentUpsertBody = {
  traineeId: string
  mentorId: string | null
  ojtId: string | null
  year?: number
}

export type AssignmentForMentor = {
  trainee_id: string
  year: number
  trainee: Pick<Profile, 'name' | 'employee_id'>
}

export type AssignmentForAdmin = {
  trainee_id: string
  mentor_id: string | null
  ojt_id: string | null
  year: number
  trainee: Pick<Profile, 'name'>
  mentor: Pick<Profile, 'name'> | null
  ojt: Pick<Profile, 'name'> | null
}

// ----------------------------------------------------------------
// Users
// ----------------------------------------------------------------

export type UserCreateBody = {
  name: string
  email: string
  role: UserRole
}

export type UserUpdateBody = {
  name?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}
