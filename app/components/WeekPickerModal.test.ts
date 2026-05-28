import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import WeekPickerModal from './WeekPickerModal.vue'

describe('WeekPickerModal', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('open=true で月名が表示される', async () => {
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: true, currentWeek: new Date(2026, 4, 25) }
    })
    expect(document.body.textContent).toContain('2026年')
    expect(document.body.textContent).toContain('5月')
  })

  it('月送りボタンで翌月へ移動する', async () => {
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: true, currentWeek: new Date(2026, 4, 25) }
    })
    // 次の月ボタンを探す（aria-label="次の月"）
    const nextMonthButton = document.querySelector<HTMLButtonElement>('button[aria-label="次の月"]')
    expect(nextMonthButton).not.toBeNull()
    nextMonthButton!.click()
    await new Promise(r => setTimeout(r, 0))
    expect(document.body.textContent).toContain('6月')
  })

  it('open=false では何も表示されない', async () => {
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: false, currentWeek: new Date(2026, 4, 25) }
    })
    expect(document.body.textContent).not.toContain('週を選択')
  })
})
