import type { Comment, Profile } from './models'

// ----------------------------------------------------------------
// Shared
// ----------------------------------------------------------------

export type UserRole = 'trainee' | 'mentor' | 'ojt' | 'admin'

export const VALID_ROLES: readonly UserRole[] = ['trainee', 'mentor', 'ojt', 'admin']

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
  mood?: 1 | 2 | 3 | 4 | 5
}

export type ReportUpdateBody = {
  check_in?: string
  check_out?: string
  content?: string
  mood?: 1 | 2 | 3 | 4 | 5 | null
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
