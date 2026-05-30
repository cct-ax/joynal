import { describe, it, expect } from 'vitest'
import {
  assignmentSchema,
  commentSchema,
  loginSchema,
  passwordChangeSchema,
  reportSchema,
  resetPasswordSchema,
  userCreateSchema
} from './schemas'

/**
 * テストの書き方サンプル。
 * Zod スキーマのバリデーションロジックをテストしています。
 * 実際の機能実装時はこのパターンを参考に、各コンポーネント・composable のテストを追加してください。
 *
 * テスト実行: pnpm test
 */

describe('reportSchema', () => {
  it('有効な日報データを受け入れる', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '18:00',
      content: '今日やったこと',
      mood: 4
    })
    expect(result.success).toBe(true)
  })

  it('mood が省略可能', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '18:00',
      content: '今日やったこと'
    })
    expect(result.success).toBe(true)
  })

  it('必須項目が空の場合はエラー', () => {
    const result = reportSchema.safeParse({
      date: '',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容'
    })
    expect(result.success).toBe(false)
  })

  it('mood が 1〜5 の範囲外はエラー', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容',
      mood: 6
    })
    expect(result.success).toBe(false)
  })

  it('mood = 0 はエラー（境界）', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容',
      mood: 0
    })
    expect(result.success).toBe(false)
  })

  it('mood = 1.5 の小数はエラー（z.literal union）', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '18:00',
      content: '内容',
      mood: 1.5
    })
    expect(result.success).toBe(false)
  })

  it('退勤時間が出勤時間より前ならエラー', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '18:00',
      check_out: '09:00',
      content: '内容'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const checkOutError = result.error.issues.find(i => i.path[0] === 'check_out')
      expect(checkOutError?.message).toBe('退勤時間は出勤時間より後を指定してください')
    }
  })

  it('退勤時間と出勤時間が同じならエラー', () => {
    const result = reportSchema.safeParse({
      date: '2026-05-19',
      check_in: '09:00',
      check_out: '09:00',
      content: '内容'
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('有効なログインデータを受け入れる', () => {
    const result = loginSchema.safeParse({
      email: 'yamada@example.com',
      password: 'secret123'
    })
    expect(result.success).toBe(true)
  })

  it('不正なメールはエラー', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123'
    })
    expect(result.success).toBe(false)
  })

  it('空のパスワードはエラー', () => {
    const result = loginSchema.safeParse({
      email: 'yamada@example.com',
      password: ''
    })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('有効なメールを受け入れる', () => {
    expect(
      resetPasswordSchema.safeParse({ email: 'yamada@example.com' }).success
    ).toBe(true)
  })

  it('不正なメールはエラー', () => {
    expect(resetPasswordSchema.safeParse({ email: 'foo' }).success).toBe(false)
  })
})

describe('passwordChangeSchema', () => {
  it('有効なパスワード変更データを受け入れる', () => {
    const result = passwordChangeSchema.safeParse({
      current: 'old-secret',
      next: 'new-secret-123',
      confirm: 'new-secret-123'
    })
    expect(result.success).toBe(true)
  })

  it('新しいパスワードが 8 文字未満はエラー', () => {
    const result = passwordChangeSchema.safeParse({
      current: 'old',
      next: 'short',
      confirm: 'short'
    })
    expect(result.success).toBe(false)
  })

  it('確認パスワード不一致はエラー', () => {
    const result = passwordChangeSchema.safeParse({
      current: 'old',
      next: 'new-secret-123',
      confirm: 'different-secret'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(i => i.path[0] === 'confirm')
      expect(confirmError?.message).toContain('一致しません')
    }
  })
})

describe('commentSchema', () => {
  it('有効なコメントを受け入れる', () => {
    const result = commentSchema.safeParse({ content: '今週もお疲れ様でした' })
    expect(result.success).toBe(true)
  })

  it('空のコメントはエラー', () => {
    const result = commentSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
  })
})

describe('userCreateSchema', () => {
  it('有効なユーザー作成データを受け入れる', () => {
    const result = userCreateSchema.safeParse({
      name: '山田 太郎',
      email: 'yamada@example.com',
      role: 'trainee'
    })
    expect(result.success).toBe(true)
  })

  it('不正なメールアドレスはエラー', () => {
    const result = userCreateSchema.safeParse({
      name: '山田 太郎',
      email: 'not-an-email',
      role: 'trainee'
    })
    expect(result.success).toBe(false)
  })

  it('不正なロールはエラー', () => {
    const result = userCreateSchema.safeParse({
      name: '山田 太郎',
      email: 'yamada@example.com',
      role: 'unknown'
    })
    expect(result.success).toBe(false)
  })
})

describe('assignmentSchema', () => {
  const validUuid = '00000000-0000-4000-8000-000000000001'

  it('有効な割り当てデータを受け入れる', () => {
    const result = assignmentSchema.safeParse({
      traineeId: validUuid,
      mentorId: validUuid,
      ojtId: null,
      year: 2026
    })
    expect(result.success).toBe(true)
  })

  // ID 検証は z.guid()（形状のみ）なので、テスト/シードで使う version=0 の UUID も受け入れる。
  // z.uuid() だと RFC のバージョン nibble を弾いて 400 になっていた（reports/comments で発生）。
  it('version nibble が 0 のシード用 UUID も受け入れる', () => {
    const result = assignmentSchema.safeParse({
      traineeId: 'a0000000-0000-0000-0000-000000000004',
      mentorId: 'a0000000-0000-0000-0000-000000000002',
      ojtId: null
    })
    expect(result.success).toBe(true)
  })

  it('UUID 形式でない traineeId はエラー', () => {
    const result = assignmentSchema.safeParse({
      traineeId: 'not-a-uuid',
      mentorId: null,
      ojtId: null
    })
    expect(result.success).toBe(false)
  })
})
