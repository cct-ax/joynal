import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { CurrentUserProfile, UserRole } from '#shared/types/api'
import AppHeader from './AppHeader.vue'

// useSupabaseUser: ログイン有無（user の truthy/null）を制御する。
const supabaseUser = ref<{ sub?: string } | null>({ sub: 'u1' })
mockNuxtImport('useSupabaseUser', () => () => supabaseUser)

// useCurrentUser: profile / pending / isAdmin を差し替えてヘッダーの描画分岐を制御する。
const profile = ref<CurrentUserProfile | null>(null)
const pending = ref(false)
const role = ref<UserRole | null>(null)
mockNuxtImport('useCurrentUser', () => () => ({
  profile,
  pending,
  isAdmin: computed(() => role.value === 'admin')
}))

// useRoute: admin ナビの active 判定に使うため path を差し替える。
const routePath = ref('/report')
mockNuxtImport('useRoute', () => () => ({
  get path() {
    return routePath.value
  }
}))

// navigateTo は呼び出し時に遅延参照する（直接返すと hoist で初期化前アクセスになる）。
const navigateToMock = vi.fn()
mockNuxtImport('navigateTo', () => (...args: unknown[]) => navigateToMock(...args))

// 条件が満たされるまで microtask + マクロタスクを回して待つ。
// Lazy 非同期コンポーネントのチャンク解決はタイマーをまたぐため flushPromises だけでは足りない。
const waitFor = async (predicate: () => boolean, timeout = 1000): Promise<void> => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('waitFor: 条件がタイムアウトしました')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

const traineeProfile: CurrentUserProfile = {
  id: 'u1',
  employee_id: 'E001',
  name: '山田 太郎',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

describe('AppHeader', () => {
  let wrapper: VueWrapper | null = null
  const fetchMock = vi.fn()

  beforeEach(() => {
    supabaseUser.value = { sub: 'u1' }
    profile.value = traineeProfile
    pending.value = false
    role.value = 'trainee'
    routePath.value = '/report'
    navigateToMock.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    // teleport 先（document.body）の DOM をテスト間で隔離する
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('ロゴ「Joynal」を表示し /report にリンクする', async () => {
    wrapper = await mountSuspended(AppHeader)
    const logo = wrapper.find('a[href="/report"]')
    expect(logo.exists()).toBe(true)
    expect(logo.text()).toContain('Joynal')
  })

  it('取得完了後はユーザー名を表示する', async () => {
    wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).toContain('山田 太郎')
  })

  it('pending 中は名前を出さず Skeleton を表示する', async () => {
    pending.value = true
    wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).not.toContain('山田 太郎')
    // USkeleton は role=status などを持たないため、要素クラスで存在確認する
    expect(wrapper.html()).toContain('rounded-full')
  })

  it('profile が無いときは「ユーザー」をフォールバック表示する', async () => {
    profile.value = null
    wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).toContain('ユーザー')
  })

  it('admin ロールでは日報 / 管理ナビを表示する', async () => {
    role.value = 'admin'
    wrapper = await mountSuspended(AppHeader)
    const nav = wrapper.find('[aria-label="管理者ナビゲーション"]')
    expect(nav.exists()).toBe(true)
    expect(nav.text()).toContain('日報')
    expect(nav.text()).toContain('管理')
  })

  it('非 admin ロールでは管理ナビを表示しない', async () => {
    role.value = 'trainee'
    wrapper = await mountSuspended(AppHeader)
    expect(wrapper.find('[aria-label="管理者ナビゲーション"]').exists()).toBe(false)
  })

  it('未ログイン（user 無し）では右側のユーザー領域を出さない', async () => {
    supabaseUser.value = null
    wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).not.toContain('山田 太郎')
    // ドロップダウン起動ボタン（メニュー aria-label）も無い
    expect(wrapper.find('[aria-label="山田 太郎 メニュー"]').exists()).toBe(false)
  })

  it('ログアウトすると /api/auth/logout を呼び external で /login へ遷移する', async () => {
    fetchMock.mockResolvedValueOnce(null)
    wrapper = await mountSuspended(AppHeader)

    // ドロップダウンを開く（メニュー起動ボタン）
    const trigger = wrapper.find('[aria-label="山田 太郎 メニュー"]')
    expect(trigger.exists()).toBe(true)
    await trigger.trigger('click')
    await flushPromises()

    // teleport 先の body から「ログアウト」項目を探してクリックする
    const items = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const logout = items.find(el => el.textContent?.includes('ログアウト'))
    expect(logout).toBeTruthy()
    logout!.click()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(navigateToMock).toHaveBeenCalledWith('/login', { external: true })
  })

  it('「パスワード変更」を選ぶとパスワード変更モーダルがマウントされる', async () => {
    wrapper = await mountSuspended(AppHeader)

    const trigger = wrapper.find('[aria-label="山田 太郎 メニュー"]')
    await trigger.trigger('click')
    await flushPromises()

    const items = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const pw = items.find(el => el.textContent?.includes('パスワード変更'))
    expect(pw).toBeTruthy()
    pw!.click()

    // Lazy コンポーネント（PasswordChangeModal）のチャンク解決はマクロタスクをまたぐため、
    // microtask（flushPromises）だけでは足りない。フォームが teleport されるまで実時間でポーリングする。
    await waitFor(() => document.body.textContent?.includes('現在のパスワード') === true)

    // PasswordChangeModal はフォームに「現在のパスワード」フィールドを持つ
    expect(document.body.textContent).toContain('現在のパスワード')
  })
})
