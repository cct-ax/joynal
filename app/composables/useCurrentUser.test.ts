import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { CurrentUserProfile } from '#shared/types/api'
import { useCurrentUser } from './useCurrentUser'

// useSupabaseUser は JWT claims（ユーザー ID は sub）。sub の有無で取得有無が変わるため差し替える。
const supabaseUser = ref<{ sub?: string } | null>(null)
mockNuxtImport('useSupabaseUser', () => () => supabaseUser)

// useRequestFetch が返す fetch を spy 化し、/api/users/me の応答（成功 / 404）を制御する。
const requestFetchMock = vi.fn()
mockNuxtImport('useRequestFetch', () => () => requestFetchMock)

const sampleProfile: CurrentUserProfile = {
  id: 'u1',
  employee_id: 'E001',
  name: '山田 太郎',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

// 戻り値を component の setup 経由で取り出す harness。
let wrapper: VueWrapper | null = null

const mountCurrentUser = async () => {
  let exposed: ReturnType<typeof useCurrentUser> | null = null
  wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exposed = useCurrentUser()
        return () => h('div')
      }
    })
  )
  if (!exposed) throw new Error('composable not initialized')
  return exposed as ReturnType<typeof useCurrentUser>
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
    supabaseUser.value = null
    clearNuxtData('current-user')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    clearNuxtData('current-user')
  })

  it('未ログイン（sub 無し）では /api/users/me を叩かず profile は null', async () => {
    supabaseUser.value = null
    requestFetchMock.mockResolvedValue(sampleProfile)

    const { profile, role, isTrainee } = await mountCurrentUser()

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(profile.value).toBeNull()
    expect(role.value).toBeNull()
    expect(isTrainee.value).toBe(false)
  })

  it('ログイン時は共有キー current-user で /api/users/me を取得しプロフィールを返す', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockResolvedValue(sampleProfile)

    const { profile, pending } = await mountCurrentUser()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/users/me')
    expect(profile.value?.name).toBe('山田 太郎')
    // 取得完了後は pending=false
    expect(pending.value).toBe(false)
  })

  it('profile が無い（404）と profileMissing=true、profile は値を持たない', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockRejectedValue({ statusCode: 404 })

    const { profile, profileMissing } = await mountCurrentUser()

    expect(profileMissing.value).toBe(true)
    // エラー時は data が解決されないため falsy（default 未指定なので undefined）
    expect(profile.value).toBeFalsy()
  })

  it('404 以外のエラーでは profileMissing=false', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockRejectedValue({ statusCode: 500 })

    const { profileMissing } = await mountCurrentUser()

    expect(profileMissing.value).toBe(false)
  })

  it('role=admin のときロール判定フラグは isAdmin のみ true', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockResolvedValue({ ...sampleProfile, role: 'admin' })

    const { role, isAdmin, isMentor, isOjt, isTrainee } = await mountCurrentUser()

    expect(role.value).toBe('admin')
    expect(isAdmin.value).toBe(true)
    expect(isMentor.value).toBe(false)
    expect(isOjt.value).toBe(false)
    expect(isTrainee.value).toBe(false)
  })

  it('role=mentor のとき isMentor のみ true', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockResolvedValue({ ...sampleProfile, role: 'mentor' })

    const { isMentor, isAdmin, isTrainee } = await mountCurrentUser()

    expect(isMentor.value).toBe(true)
    expect(isAdmin.value).toBe(false)
    expect(isTrainee.value).toBe(false)
  })

  it('role=ojt のとき isOjt のみ true', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockResolvedValue({ ...sampleProfile, role: 'ojt' })

    const { isOjt, isMentor } = await mountCurrentUser()

    expect(isOjt.value).toBe(true)
    expect(isMentor.value).toBe(false)
  })

  it('不正な role 文字列は role=null に絞り込む', async () => {
    supabaseUser.value = { sub: 'u1' }
    requestFetchMock.mockResolvedValue({ ...sampleProfile, role: 'superuser' })

    const { role, isAdmin, isTrainee } = await mountCurrentUser()

    expect(role.value).toBeNull()
    expect(isAdmin.value).toBe(false)
    expect(isTrainee.value).toBe(false)
  })
})
