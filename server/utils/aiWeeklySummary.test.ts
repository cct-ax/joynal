import { describe, expect, it } from 'vitest'
import {
  WEEKLY_SUMMARY_MENTOR_PROMPT,
  WEEKLY_SUMMARY_SELF_PROMPT,
  buildWeeklySummaryUserMessage,
  deriveAudience,
  systemPromptFor,
  weekRange
} from './aiWeeklySummary'

describe('deriveAudience', () => {
  it('対象が自分なら self、他人なら mentor', () => {
    expect(deriveAudience('u1', 'u1')).toBe('self')
    expect(deriveAudience('u2', 'u1')).toBe('mentor')
  })
})

describe('weekRange', () => {
  it('月曜から金曜（+4日）の範囲を返す', () => {
    expect(weekRange('2026-05-18')).toEqual({ from: '2026-05-18', to: '2026-05-22' })
  })

  it('月跨ぎも正しく計算する', () => {
    expect(weekRange('2026-04-27')).toEqual({ from: '2026-04-27', to: '2026-05-01' })
  })
})

describe('systemPromptFor', () => {
  it('audience で self/mentor のプロンプトを返し、いずれも代筆禁止を含む', () => {
    expect(systemPromptFor('self')).toBe(WEEKLY_SUMMARY_SELF_PROMPT)
    expect(systemPromptFor('mentor')).toBe(WEEKLY_SUMMARY_MENTOR_PROMPT)
    expect(WEEKLY_SUMMARY_SELF_PROMPT).toContain('代筆')
    expect(WEEKLY_SUMMARY_MENTOR_PROMPT).toContain('代筆')
  })
})

describe('buildWeeklySummaryUserMessage', () => {
  it('日報を日付・気分・本文で整形する', () => {
    const msg = buildWeeklySummaryUserMessage([
      { date: '2026-05-18', content: 'API実装', mood: 4 },
      { date: '2026-05-19', content: 'レビュー対応', mood: null }
    ])
    expect(msg).toContain('2026-05-18')
    expect(msg).toContain('4/5')
    expect(msg).toContain('API実装')
    expect(msg).toContain('未入力')
  })

  it('空配列は「日報がありません」', () => {
    expect(buildWeeklySummaryUserMessage([])).toContain('ありません')
  })
})
