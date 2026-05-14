import { describe, it, expect } from 'vitest'
import { reportSchema, commentSchema, userCreateSchema, assignmentSchema } from './schemas'

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
  const validUuid = '00000000-0000-0000-0000-000000000001'

  it('有効な割り当てデータを受け入れる', () => {
    const result = assignmentSchema.safeParse({
      traineeId: validUuid,
      mentorId: validUuid,
      ojtId: null,
      year: 2026
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
