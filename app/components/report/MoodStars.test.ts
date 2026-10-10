import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import MoodStars from './MoodStars.vue'

describe('MoodStars', () => {
  it('5つの星ボタンを描画する', async () => {
    const wrapper = await mountSuspended(MoodStars, { props: { modelValue: null } })
    expect(wrapper.findAll('button')).toHaveLength(5)
  })

  it('星クリックで値を emit する', async () => {
    const wrapper = await mountSuspended(MoodStars, { props: { modelValue: null } })
    const buttons = wrapper.findAll('button')
    await buttons[2]!.trigger('click') // 3 番目
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([3])
  })

  it('現在値と同じ星をクリックすると null を emit する（解除）', async () => {
    const wrapper = await mountSuspended(MoodStars, { props: { modelValue: 3 } })
    const buttons = wrapper.findAll('button')
    await buttons[2]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![0]).toEqual([null])
  })

  it('readonly では button を描画しない（非インタラクティブな span）', async () => {
    const wrapper = await mountSuspended(MoodStars, {
      props: { modelValue: 3, readonly: true }
    })
    // 行のトグルボタン内に置けるよう、readonly はボタンを描画しない
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('readonly では group の aria-label で現在値を伝える', async () => {
    const wrapper = await mountSuspended(MoodStars, {
      props: { modelValue: 3, readonly: true }
    })
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('気分 3 / 5')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
