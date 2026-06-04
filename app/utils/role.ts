import { VALID_ROLES, type UserRole } from '#shared/types/api'

/**
 * 文字列が UserRole の値域かを判定する type guard。
 * DB/Profile.role は string のため、UI で UserRole に絞り込む際に使う。
 */
export const isUserRole = (v: string | null | undefined): v is UserRole =>
  v !== null && v !== undefined && (VALID_ROLES as readonly string[]).includes(v)

/**
 * ロール別の日本語ラベル。
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  trainee: '新人',
  mentor: 'メンター',
  ojt: 'OJT',
  admin: '管理者'
}

/**
 * ロール別のバッジ用 Tailwind クラス。
 * docs/design-spec.md のロールバッジカラーに対応する。
 * - 新人: Indigo
 * - メンター: Green
 * - OJT: Purple
 * - 管理者: Gray
 *
 * ダークモードも考慮した値を返す。
 */
export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  trainee: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  mentor: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  ojt: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  admin: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}
