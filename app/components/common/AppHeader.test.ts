import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AppHeader from './AppHeader.vue'

const user = ref({ id: '00000000-0000-4000-8000-000000000001' })
mockNuxtImport('useSupabaseUser', () => () => user)

mockNuxtImport('useCurrentUser', () => () => ({
  profile: ref({ name: 'テストユーザー' }),
  isAdmin: ref(false)
}))

mockNuxtImport('useApiError', () => () => ({ notify: vi.fn() }))

const dropdownMenuStub = defineComponent({
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  template: '<button data-testid="password-menu-item">パスワード変更</button>'
})

const headerStubs = {
  NuxtLink: {
    template: '<a><slot /></a>'
  },
  UColorModeButton: true,
  UButton: {
    template: '<button><slot /></button>'
  },
  UDropdownMenu: dropdownMenuStub
}

describe('AppHeader', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('初期表示ではパスワード変更モーダルをマウントしない', async () => {
    wrapper = await mountSuspended(AppHeader, {
      attachTo: document.body,
      global: {
        stubs: headerStubs
      }
    })

    expect(document.body.textContent).not.toContain('現在のパスワード')
  })

  it('ユーザーメニューにパスワード変更の起動処理を設定する', async () => {
    wrapper = await mountSuspended(AppHeader, {
      global: {
        stubs: headerStubs
      }
    })

    const menuItems: unknown = wrapper.findComponent(dropdownMenuStub).props('items')
    expect(menuItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'パスワード変更',
        onSelect: expect.any(Function)
      })
    ]))
  })
})
