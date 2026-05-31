import { describe, expect, it } from 'vitest'
import { isUserRole, ROLE_BADGE_CLASSES, ROLE_LABELS } from './role'

describe('isUserRole', () => {
  it('妥当な UserRole 値なら true を返す', () => {
    expect(isUserRole('trainee')).toBe(true)
    expect(isUserRole('mentor')).toBe(true)
    expect(isUserRole('ojt')).toBe(true)
    expect(isUserRole('admin')).toBe(true)
  })

  it('値域外の文字列・空文字・null・undefined なら false を返す', () => {
    expect(isUserRole('foo')).toBe(false)
    expect(isUserRole('')).toBe(false)
    expect(isUserRole(null)).toBe(false)
    expect(isUserRole(undefined)).toBe(false)
  })
})

describe('ROLE_LABELS', () => {
  it('4 ロールすべての日本語ラベルを持つ', () => {
    expect(ROLE_LABELS.trainee).toBe('新人')
    expect(ROLE_LABELS.mentor).toBe('メンター')
    expect(ROLE_LABELS.ojt).toBe('OJT')
    expect(ROLE_LABELS.admin).toBe('管理者')
  })
})

describe('ROLE_BADGE_CLASSES', () => {
  it('4 ロールすべてのバッジクラスを持つ', () => {
    expect(ROLE_BADGE_CLASSES.trainee).toContain('indigo')
    expect(ROLE_BADGE_CLASSES.mentor).toContain('green')
    expect(ROLE_BADGE_CLASSES.ojt).toContain('purple')
    expect(ROLE_BADGE_CLASSES.admin).toContain('gray')
  })

  it('ダークモード対応のクラスを含む', () => {
    expect(ROLE_BADGE_CLASSES.trainee).toContain('dark:')
    expect(ROLE_BADGE_CLASSES.mentor).toContain('dark:')
    expect(ROLE_BADGE_CLASSES.ojt).toContain('dark:')
    expect(ROLE_BADGE_CLASSES.admin).toContain('dark:')
  })
})
