import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import TraineeSelector from './TraineeSelector.vue'

const options = [
  { id: 'trainee-1', name: '山田 太郎' },
  { id: 'trainee-2', name: '鈴木 花子' }
]

describe('TraineeSelector', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    wrapper = null
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('「対象:」ラベルと選択中の名前を表示する', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: 'trainee-1' }
    })
    expect(wrapper.text()).toContain('対象:')
    // value-key=value で model は ID。選択中の label がトリガーに出る。
    expect(wrapper.text()).toContain('山田 太郎')
  })

  it('USelectMenu に label/value 形式の items を渡す', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: null }
    })
    const select = wrapper.findComponent({ name: 'USelectMenu' })
    expect(select.props('items')).toEqual([
      { label: '山田 太郎', value: 'trainee-1' },
      { label: '鈴木 花子', value: 'trainee-2' }
    ])
    expect(select.props('valueKey')).toBe('value')
  })

  it('placeholder=true（admin）でプレースホルダを表示する', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: null, placeholder: true }
    })
    const select = wrapper.findComponent({ name: 'USelectMenu' })
    expect(select.props('placeholder')).toBe('選択してください')
  })

  it('placeholder 未指定（mentor 等）ではプレースホルダを出さない', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: 'trainee-1' }
    })
    const select = wrapper.findComponent({ name: 'USelectMenu' })
    expect(select.props('placeholder')).toBeUndefined()
  })

  it('USelectMenu の update:modelValue を v-model に中継する', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: null }
    })
    const select = wrapper.findComponent({ name: 'USelectMenu' })
    select.vm.$emit('update:modelValue', 'trainee-2')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trainee-2'])
  })

  it('USelectMenu が undefined を emit したら null に変換して中継する（クリア操作）', async () => {
    wrapper = await mountSuspended(TraineeSelector, {
      props: { options, modelValue: 'trainee-1' }
    })
    const select = wrapper.findComponent({ name: 'USelectMenu' })
    // USelectMenu は選択クリア時に undefined を emit しうる。外向き model は null に正規化する。
    select.vm.$emit('update:modelValue', undefined)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })
})
