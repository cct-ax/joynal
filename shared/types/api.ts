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

/** GET /api/reports/mood-trend のクエリ（期間と任意のユーザー絞り込み） */
export type MoodTrendQuery = {
  from: string
  to: string
  userId?: string
}

/** mood 推移グラフの1点（日付＋気分）。mood 未入力（NULL）の日は含めない。 */
export type MoodTrendPoint = {
  date: string
  mood: MoodValue
}

// ----------------------------------------------------------------
// AI（コーチング・週次サマリー）
// ----------------------------------------------------------------

/** POST /api/ai/coach のリクエストボディ（入力中ドラフト＋気分。どちらも任意・本文は空可） */
export type AiCoachBody = {
  content?: string
  mood?: MoodValue
}

/**
 * POST /api/ai/coach のレスポンス。
 * 振り返りの深掘り質問（2〜3個）と短い励まし（1〜2文）。本文の代筆はしない。
 * ドラフトが空のときは questions のみ（スターター質問）、feedback は空文字。
 */
export type AiCoachResponse = {
  questions: string[]
  feedback: string
}

/**
 * 週次サマリーの語り口。
 * 'self'＝新人本人の振り返り、'mentor'＝メンター/OJT/管理者の観察。
 * 値はクライアントの指定を信用せず、サーバーが「対象 userId == 自分か」で導出する。
 */
export type AiAudience = 'self' | 'mentor'

/** GET /api/ai/weekly-summary のクエリ（対象ユーザー＋週） */
export type WeeklySummaryQuery = {
  userId: string
  weekStart: string
}

/** POST /api/ai/weekly-summary のリクエストボディ（生成/再生成） */
export type WeeklySummaryBody = {
  userId: string
  weekStart: string
}

/** 週次サマリー1件分（キャッシュ済みの内容＋鮮度判定用の生成時日報 max(updated_at)） */
export type WeeklySummaryData = {
  content: string
  audience: AiAudience
  sourceUpdatedAt: string
}

/**
 * GET /api/ai/weekly-summary のレスポンス。
 * summary が null なら未生成。latestReportUpdatedAt はその週の日報 max(updated_at)（無ければ null）。
 * 鮮度（再生成要否）は summary.sourceUpdatedAt < latestReportUpdatedAt で判定する。
 */
export type WeeklySummaryGetResponse = {
  summary: WeeklySummaryData | null
  latestReportUpdatedAt: string | null
}

/**
 * POST /api/ai/weekly-summary（生成）の SSE イベントの data ペイロード。
 *
 * 生成は HTTP 200 + text/event-stream で逐次配信する。事前チェック（認証・バリデーション・
 * 日報なし 422・レート上限 429）は SSE 開始前に通常の HTTP ステータスで返す。SSE 開始後に
 * 起きうる AI 上流失敗のみ `error` イベントで配信する。各イベントの data は 1 行 JSON 文字列。
 *
 * - event:`delta` → WeeklySummaryDeltaData（生成トークン片。順次連結する）
 * - event:`done`  → WeeklySummaryDoneData（完了メタ。本文確定・鮮度基準）
 * - event:`error` → WeeklySummaryErrorData（AI 上流失敗。message/code はエラー封筒と同形）
 */
export type WeeklySummaryDeltaData = { text: string }
export type WeeklySummaryDoneData = { audience: AiAudience, sourceUpdatedAt: string }
export type WeeklySummaryErrorData = { message: string, code: string }

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
