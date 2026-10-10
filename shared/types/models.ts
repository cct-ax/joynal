import type { Tables, TablesInsert, TablesUpdate } from './database.types'

/** 日報行（daily_reports テーブル） */
export type DailyReport = Tables<'daily_reports'>
/** 日報の挿入用型 */
export type DailyReportInsert = TablesInsert<'daily_reports'>
/** 日報の更新用型 */
export type DailyReportUpdate = TablesUpdate<'daily_reports'>

/** 週次コメント行（comments テーブル） */
export type Comment = Tables<'comments'>
/** コメントの挿入用型 */
export type CommentInsert = TablesInsert<'comments'>

/** プロフィール（ユーザー）行（profiles テーブル） */
export type Profile = Tables<'profiles'>
/** プロフィールの更新用型 */
export type ProfileUpdate = TablesUpdate<'profiles'>

/** メンター担当割り当て行（mentor_assignments テーブル） */
export type MentorAssignment = Tables<'mentor_assignments'>
/** メンター担当割り当ての挿入用型 */
export type MentorAssignmentInsert = TablesInsert<'mentor_assignments'>
/** メンター担当割り当ての更新用型 */
export type MentorAssignmentUpdate = TablesUpdate<'mentor_assignments'>

/** AI 週次サマリー行（ai_summaries テーブル） */
export type AiSummary = Tables<'ai_summaries'>
/** AI 週次サマリーの挿入用型 */
export type AiSummaryInsert = TablesInsert<'ai_summaries'>
