import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import WeekNavigator from './WeekNavigator.vue'

describe('WeekNavigator', () => {
  // 過去の月曜日（確実に今週ではない）
  const pastMonday = new Date(2025, 0, 6) // 2025-01-06 (Mon)

  it('週ラベルを表示する', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: pastMonday }
    })
    expect(wrapper.text()).toContain('2025/1/06（月）〜 1/10（金）')
  })

  it('前の週ボタンで -7 日を emit する', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: pastMonday }
    })
    const buttons = wrapper.findAll('button')
    // 最初の UButton = 前の週
    await buttons[0]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    // 2025-01-06 - 7日 = 2024-12-30
    const newDate = emitted![0]![0] as Date
    expect(newDate.getFullYear()).toBe(2024)
    expect(newDate.getMonth()).toBe(11)
    expect(newDate.getDate()).toBe(30)
  })

  it('次の週ボタンで +7 日を emit する', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: pastMonday }
    })
    const buttons = wrapper.findAll('button')
    // [0] = 前の週、[1] = 週ラベル、[2] = 次の週
    await buttons[2]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    const newDate = emitted![0]![0] as Date
    expect(newDate.getDate()).toBe(13)
    expect(newDate.getMonth()).toBe(0)
  })

  it('今週でないときは「今週」ボタンが表示される', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: pastMonday }
    })
    expect(wrapper.text()).toContain('今週')
  })

  it('今週月曜のときは「今週」ボタンが非表示', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: getMondayOf(new Date()) }
    })
    expect(wrapper.text()).not.toContain('今週')
  })

  it('週ラベルクリックでピッカーが開く', async () => {
    const wrapper = await mountSuspended(WeekNavigator, {
      props: { modelValue: pastMonday }
    })
    // [1] = 週ラベルボタン
    const labelButton = wrapper.findAll('button')[1]!
    await labelButton.trigger('click')
    // モーダルは teleport される → document.body をチェック
    expect(document.body.textContent).toContain('週を選択')
  })
})
