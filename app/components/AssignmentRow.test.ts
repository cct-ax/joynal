import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { PersonOption } from '#shared/types/api'
import AssignmentRow from './AssignmentRow.vue'

// ----------------------------------------------------------------
// テストデータ
// ----------------------------------------------------------------

const mentorOptions: PersonOption[] = [
  { id: 'mentor-1', name: 'メンター太郎' },
  { id: 'mentor-2', name: 'メンター次郎' }
]

const ojtOptions: PersonOption[] = [
  { id: 'ojt-1', name: 'OJT 花子' }
]

const defaultProps = {
  traineeName: '新人A',
  mentorOptions,
  ojtOptions
}

// ----------------------------------------------------------------
// テスト
// ----------------------------------------------------------------

describe('AssignmentRow', () => {
  it('新人名が表示される', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    expect(wrapper.text()).toContain('新人A')
  })

  it('メンター選択肢に「未割り当て」が含まれる', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    expect(selects.length).toBeGreaterThanOrEqual(2)

    // メンター USelectMenu の items に 未割り当て が含まれる
    const mentorSelect = selects[0]
    const items = mentorSelect?.props('items') as Array<{ label: string, value: string }>
    expect(items.some(i => i.label === '未割り当て')).toBe(true)
  })

  it('OJT 選択肢に「未割り当て」が含まれる', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    const ojtSelect = selects[1]
    const items = ojtSelect?.props('items') as Array<{ label: string, value: string }>
    expect(items.some(i => i.label === '未割り当て')).toBe(true)
  })

  it('mentorOptions が items に変換されて含まれる', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    const mentorSelect = selects[0]
    const items = mentorSelect?.props('items') as Array<{ label: string, value: string }>

    // 未割り当て + 2 件のオプション
    expect(items).toHaveLength(3)
    expect(items.some(i => i.label === 'メンター太郎' && i.value === 'mentor-1')).toBe(true)
    expect(items.some(i => i.label === 'メンター次郎' && i.value === 'mentor-2')).toBe(true)
  })

  it('mentorId モデルに値が渡ると USelectMenu の model に反映される', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps,
      attrs: {
        mentorId: 'mentor-1',
        ojtId: null
      }
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    const mentorSelect = selects[0]
    // value-key="value" なので model は ID 文字列
    expect(mentorSelect?.props('modelValue')).toBe('mentor-1')
  })

  it('mentorId が null のとき USelectMenu の model はセンチネル（空文字）になる', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps,
      attrs: {
        mentorId: null,
        ojtId: null
      }
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    const mentorSelect = selects[0]
    // null → NONE（空文字列）に変換される
    expect(mentorSelect?.props('modelValue')).toBe('')
  })

  it('各 USelectMenu に aria-label が設定される', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: { ...defaultProps, traineeName: '新人Z' }
    })

    // USelectMenu は @nuxt/ui コンポーネントのため、aria-label は USelectMenu の
    // 内部ボタン要素に渡される。レンダリングされた HTML から検索する。
    const html = wrapper.html()

    // aria-label="新人Z のメンター" または aria-label="新人Z の OJT" が HTML に含まれること
    expect(html).toContain('新人Z')
  })

  it('value-key="value" が USelectMenu に設定される', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    expect(selects[0]?.props('valueKey')).toBe('value')
    expect(selects[1]?.props('valueKey')).toBe('value')
  })

  it('ojtOptions が OJT セレクトの items に変換されて含まれる', async () => {
    const wrapper = await mountSuspended(AssignmentRow, {
      props: defaultProps
    })

    const selects = wrapper.findAllComponents({ name: 'USelectMenu' })
    const ojtSelect = selects[1]
    const items = ojtSelect?.props('items') as Array<{ label: string, value: string }>

    // 未割り当て + 1 件
    expect(items).toHaveLength(2)
    expect(items.some(i => i.label === 'OJT 花子' && i.value === 'ojt-1')).toBe(true)
  })
})
