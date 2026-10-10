import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import RoleBadge from './RoleBadge.vue'

describe('RoleBadge', () => {
  it.each([
    { role: 'trainee' as const, label: '新人', color: 'indigo' },
    { role: 'mentor' as const, label: 'メンター', color: 'green' },
    { role: 'ojt' as const, label: 'OJT', color: 'purple' },
    { role: 'admin' as const, label: '管理者', color: 'gray' }
  ])('$role ロールで「$label」と $color クラスを表示する', async ({ role, label, color }) => {
    const wrapper = await mountSuspended(RoleBadge, { props: { role } })
    expect(wrapper.text()).toBe(label)
    expect(wrapper.attributes('class')).toContain(color)
  })
})
