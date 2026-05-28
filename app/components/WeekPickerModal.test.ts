import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import WeekPickerModal from './WeekPickerModal.vue'

describe('WeekPickerModal', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  // ロケール依存（月名の英/日表記）を避け、構造（カレンダーのセル）と emit で検証する。
  // テスト環境では UApp の :locale が効かないため、月名テキストには依存しない。

  it('open=true で UCalendar の日付セルが表示される', async () => {
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: true, currentWeek: new Date(2026, 4, 25) }
    })
    expect(document.querySelectorAll('[data-slot="cellTrigger"]').length).toBeGreaterThan(0)
  })

  it('open=false では日付セルが表示されない', async () => {
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: false, currentWeek: new Date(2026, 4, 25) }
    })
    expect(document.querySelectorAll('[data-slot="cellTrigger"]').length).toBe(0)
  })

  it('日付クリックでその週の月曜を select する', async () => {
    // currentWeek は実アプリ同様「月曜」を渡す（2026-05-11 月）→ 5月が表示される
    wrapper = await mountSuspended(WeekPickerModal, {
      props: { open: true, currentWeek: new Date(2026, 4, 11) }
    })
    // 別の週の 2026-05-22（金）をクリック → その週の月曜 = 2026-05-18
    const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="cellTrigger"]'))
    const target = cells.find(c => c.textContent?.trim() === '22')
    expect(target).toBeTruthy()
    target!.click()
    await flushPromises()

    const emitted = wrapper.emitted('select')
    expect(emitted).toBeTruthy()
    const monday = emitted![0]![0] as Date
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 4, 18])
  })
})
