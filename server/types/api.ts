import type { Tables } from '~/types/database.types'

// ----------------------------------------------------------------
// Shared
// ----------------------------------------------------------------

export type UserRole = 'trainee' | 'mentor' | 'ojt' | 'admin'

export const VALID_ROLES: readonly UserRole[] = ['trainee', 'mentor', 'ojt', 'admin']

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------

export interface ReportsQuery {
  weekStart: string
  userId?: string
}

export interface CreateReportBody {
  date: string
  check_in: string
  check_out: string
  content: string
  mood?: number | null
}

export interface UpdateReportBody {
  check_in?: string
  check_out?: string
  content?: string
  mood?: number | null
}

export type ReportRow = Tables<'daily_reports'>

// ----------------------------------------------------------------
// Comments
// ----------------------------------------------------------------

export interface CommentsQuery {
  weekStart: string
  traineeId: string
}

export interface UpsertCommentBody {
  weekStart: string
  traineeId: string
  content: string
}

export interface CommentRow extends Tables<'comments'> {
  commenter: Pick<Tables<'profiles'>, 'name' | 'role'>
}

// ----------------------------------------------------------------
// Assignments
// ----------------------------------------------------------------

export interface AssignmentsMeQuery {
  year?: string
}

export interface UpsertAssignmentBody {
  traineeId: string
  mentorId: string | null
  ojtId: string | null
  year?: number
}

export type AssignmentRow = Tables<'mentor_assignments'>

export interface AssignmentForMentorRow {
  trainee_id: string
  year: number
  trainee: Pick<Tables<'profiles'>, 'name' | 'employee_id'>
}

export interface AssignmentForAdminRow {
  trainee_id: string
  mentor_id: string | null
  ojt_id: string | null
  year: number
  trainee: Pick<Tables<'profiles'>, 'name'>
  mentor: Pick<Tables<'profiles'>, 'name'> | null
  ojt: Pick<Tables<'profiles'>, 'name'> | null
}

// ----------------------------------------------------------------
// Users
// ----------------------------------------------------------------

export interface CreateUserBody {
  name: string
  email: string
  role: UserRole
}

export interface UpdateUserBody {
  name?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}

export type ProfileRow = Tables<'profiles'>
