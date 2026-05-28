import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import PasswordChangeModal from './PasswordChangeModal.vue'

// Supabase 初期化は test env では失敗するためモックする
mockNuxtImport('useSupabaseClient', () => () => ({
  auth: { updateUser: vi.fn().mockResolvedValue({ error: null }) }
}))

describe('PasswordChangeModal', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    // teleport 先（document.body）の DOM をテスト間で隔離する
    wrapper?.unmount()
    wrapper = null
  })

  it('open=true で 3 フィールドのフォームが表示される', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: true }
    })
    expect(document.body.textContent).toContain('現在のパスワード')
    expect(document.body.textContent).toContain('新しいパスワード')
    expect(document.body.textContent).toContain('新しいパスワード（確認）')
  })

  it('open=false ではフォームが表示されない', async () => {
    wrapper = await mountSuspended(PasswordChangeModal, {
      props: { open: false }
    })
    expect(document.body.textContent).not.toContain('現在のパスワード')
  })
})
