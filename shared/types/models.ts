import type { Tables, TablesInsert, TablesUpdate } from './database.types'

export type DailyReport = Tables<'daily_reports'>
export type DailyReportInsert = TablesInsert<'daily_reports'>
export type DailyReportUpdate = TablesUpdate<'daily_reports'>

export type Comment = Tables<'comments'>
export type CommentInsert = TablesInsert<'comments'>

export type Profile = Tables<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type MentorAssignment = Tables<'mentor_assignments'>
export type MentorAssignmentInsert = TablesInsert<'mentor_assignments'>
export type MentorAssignmentUpdate = TablesUpdate<'mentor_assignments'>
