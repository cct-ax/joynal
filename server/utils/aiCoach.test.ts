import { describe, expect, it } from 'vitest'
import { COACH_SYSTEM_PROMPT, buildCoachUserMessage, parseCoachResponse } from './aiCoach'

describe('COACH_SYSTEM_PROMPT', () => {
  it('代筆禁止と JSON 出力の指示を含む（方針の固定）', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('代筆')
    expect(COACH_SYSTEM_PROMPT).toContain('questions')
    expect(COACH_SYSTEM_PROMPT).toContain('feedback')
  })
})

describe('buildCoachUserMessage', () => {
  it('ドラフトがあれば気分とドラフト本文を含める', () => {
    const msg = buildCoachUserMessage('今日はAPIを実装した', 4)
    expect(msg).toContain('4/5')
    expect(msg).toContain('今日はAPIを実装した')
  })

  it('ドラフトが空なら書き始めを促し、mood 未入力も扱える', () => {
    const msg = buildCoachUserMessage('', undefined)
    expect(msg).toContain('未入力')
    expect(msg).toContain('まだありません')
  })

  it('空白のみのドラフトは空扱い', () => {
    const msg = buildCoachUserMessage('   ', 3)
    expect(msg).toContain('3/5')
    expect(msg).toContain('まだありません')
  })
})

describe('parseCoachResponse', () => {
  it('素の JSON をパースする', () => {
    expect(parseCoachResponse('{"questions":["Q1","Q2"],"feedback":"いいね"}'))
      .toEqual({ questions: ['Q1', 'Q2'], feedback: 'いいね' })
  })

  it('コードフェンス付き JSON をパースする', () => {
    expect(parseCoachResponse('```json\n{"questions":["Q1"],"feedback":""}\n```'))
      .toEqual({ questions: ['Q1'], feedback: '' })
  })

  it('前後に説明文があっても最初の { 〜 最後の } を取る', () => {
    expect(parseCoachResponse('はい:\n{"questions":["Q1"],"feedback":"x"}\n以上'))
      .toEqual({ questions: ['Q1'], feedback: 'x' })
  })

  it('空文字や空白のみの質問は除去する', () => {
    expect(parseCoachResponse('{"questions":["Q1","","  "],"feedback":"x"}'))
      .toEqual({ questions: ['Q1'], feedback: 'x' })
  })

  it('feedback が無くても空文字で返す', () => {
    expect(parseCoachResponse('{"questions":["Q1"]}'))
      .toEqual({ questions: ['Q1'], feedback: '' })
  })

  it('questions が無い/空配列なら null', () => {
    expect(parseCoachResponse('{"feedback":"x"}')).toBeNull()
    expect(parseCoachResponse('{"questions":[],"feedback":"x"}')).toBeNull()
  })

  it('不正な JSON / 空文字なら null', () => {
    expect(parseCoachResponse('これは JSON ではありません')).toBeNull()
    expect(parseCoachResponse('')).toBeNull()
  })
})
