import type { Comment, Profile } from './models'

// ----------------------------------------------------------------
// Shared
// ----------------------------------------------------------------

/** アプリケーション全体で使用するユーザーロール */
export type UserRole = 'trainee' | 'mentor' | 'ojt' | 'admin'

/** 有効なロールの一覧（バリデーションや選択肢生成に使用） */
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
// Auth
// ----------------------------------------------------------------

export type UpdatePasswordResponse = {
  success: true
}

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------

/** GET /api/reports のクエリ（対象週と任意のユーザー絞り込み） */
export type ReportsQuery = {
  weekStart: string
  userId?: string
}

/** POST /api/reports のリクエストボディ */
export type ReportCreateBody = {
  date: string
  check_in: string
  check_out: string
  content: string
  mood?: MoodValue
}

/** PUT /api/reports/[id] のリクエストボディ（全フィールド任意） */
export type ReportUpdateBody = {
  check_in?: string
  check_out?: string
  content?: string
  mood?: MoodValue | null
}

// ----------------------------------------------------------------
// Comments
// ----------------------------------------------------------------

/** GET /api/comments のクエリ（対象週と新人 ID） */
export type CommentsQuery = {
  weekStart: string
  traineeId: string
}

/** PUT /api/comments のリクエストボディ（週次コメント upsert） */
export type CommentUpsertBody = {
  weekStart: string
  traineeId: string
  content: string
}

/** コメントにコメント投稿者の名前・ロールを結合したレスポンス型 */
export type CommentWithCommenter = Comment & {
  commenter: Pick<Profile, 'name' | 'role'>
}

// ----------------------------------------------------------------
// Assignments
// ----------------------------------------------------------------

/** GET /api/assignments/me のクエリ（任意の年度絞り込み） */
export type AssignmentsMeQuery = {
  year?: string
}

/** PUT /api/assignments のリクエストボディ（メンター/OJT 割り当て upsert） */
export type AssignmentUpsertBody = {
  traineeId: string
  mentorId: string | null
  ojtId: string | null
  year?: number
}

/** メンター向け担当新人一覧の行型（氏名・社員 ID のみ） */
export type AssignmentForMentor = {
  trainee_id: string
  year: number
  trainee: Pick<Profile, 'name' | 'employee_id'>
}

/** 管理者向け担当割り当て一覧の行型（新人・メンター・OJT の氏名を含む） */
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

/** POST /api/users のリクエストボディ（管理者によるユーザー招待） */
export type UserCreateBody = {
  name: string
  employee_id: string
  email: string
  role: UserRole
}

/** PUT /api/users/[id] のリクエストボディ（全フィールド任意） */
export type UserUpdateBody = {
  name?: string
  employee_id?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}

/**
 * GET /api/users/me の戻り値。
 * email は PII のため一般ユーザーには返さない（DB 側でもカラム権限で authenticated から除外）。
 */
export type CurrentUserProfile = Omit<Profile, 'email'>

// ----------------------------------------------------------------
// Assignment admin view-models
// ----------------------------------------------------------------

/**
 * メンター/OJT 選択セレクト用の人物オプション。
 * useMentorAssignments で生成し AssignmentRow へ渡す。
 */
export type PersonOption = {
  id: string
  name: string
}

/**
 * 担当割り当て管理画面の編集行ビューモデル。
 * 全新人（is_active=true かつ role=trainee）を網羅し、
 * 未割り当ての新人は mentorId/ojtId が null になる。
 */
export type AssignmentRowVM = {
  traineeId: string
  traineeName: string
  mentorId: string | null
  ojtId: string | null
}
