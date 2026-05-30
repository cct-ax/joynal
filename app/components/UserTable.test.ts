import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { Profile } from '#shared/types/models'
import UserTable from './UserTable.vue'

const activeUser: Profile = {
  id: 'u1',
  employee_id: 'E001',
  name: '山田 太郎',
  email: 'taro@example.com',
  role: 'trainee',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

const inactiveUser: Profile = {
  id: 'u2',
  employee_id: 'E002',
  name: '佐藤 花子',
  email: 'hanako@example.com',
  role: 'mentor',
  is_active: false,
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
}

describe('UserTable', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('ユーザー名・社員 ID・メールアドレスをレンダリングする', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser, inactiveUser] }
    })
    const text = wrapper.text()
    expect(text).toContain('山田 太郎')
    expect(text).toContain('E001')
    expect(text).toContain('taro@example.com')
    expect(text).toContain('佐藤 花子')
  })

  it('役割バッジを正しいロール名で表示する', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser] }
    })
    // RoleBadge は ROLE_LABELS を使うので「新人」が表示される
    expect(wrapper.text()).toContain('新人')
  })

  it('users が空のとき「ユーザーがいません」と表示する', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [] }
    })
    expect(wrapper.text()).toContain('ユーザーがいません')
  })

  it('loading 中（users 空）は「ユーザーがいません」を表示しない（スケルトン表示）', async () => {
    // 初回ロード時に空メッセージが一瞬出る違和感を防ぐ。
    // 取得が終わるまではスケルトンを出し、空メッセージはロード完了後だけにする。
    wrapper = await mountSuspended(UserTable, {
      props: { users: [], loading: true }
    })
    expect(wrapper.text()).not.toContain('ユーザーがいません')
  })

  it('自分の行（currentUserId 一致）は「無効化」が disabled で「あなた」バッジが出る', async () => {
    // 自己ロックアウト防止: 自分自身は無効化させない（サーバーガードに加えた UI 抑止）。
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser], currentUserId: activeUser.id }
    })
    expect(wrapper.text()).toContain('あなた')
    const deactivate = wrapper.findAll('button').find(b => b.text() === '無効化')
    expect(deactivate).toBeDefined()
    expect((deactivate?.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('他人の行の「無効化」は活性のまま', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser], currentUserId: 'someone-else' }
    })
    expect(wrapper.text()).not.toContain('あなた')
    const deactivate = wrapper.findAll('button').find(b => b.text() === '無効化')
    expect((deactivate?.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('編集ボタンクリックで edit イベントをユーザーオブジェクト付きで emit する', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser] }
    })
    // 「編集」ボタンを見つけてクリック
    const editButtons = wrapper.findAll('button').filter(b => b.text() === '編集')
    expect(editButtons.length).toBeGreaterThan(0)
    await editButtons[0]?.trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')?.[0]).toEqual([activeUser])
  })

  it('有効ユーザーに「無効化」ボタンが表示される', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser] }
    })
    expect(wrapper.text()).toContain('無効化')
    expect(wrapper.text()).not.toContain('有効化')
  })

  it('無効ユーザーに「有効化」ボタンが表示される', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [inactiveUser] }
    })
    expect(wrapper.text()).toContain('有効化')
    expect(wrapper.text()).not.toContain('無効化')
  })

  it('有効化ボタンクリックで setActive(id, true) を即時 emit する', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [inactiveUser] }
    })
    const activateButton = wrapper.findAll('button').find(b => b.text() === '有効化')
    expect(activateButton).toBeDefined()
    await activateButton?.trigger('click')
    expect(wrapper.emitted('setActive')).toBeTruthy()
    expect(wrapper.emitted('setActive')?.[0]).toEqual(['u2', true])
  })

  it('無効化ボタンクリックで確認ダイアログが開く（即時 emit しない）', async () => {
    wrapper = await mountSuspended(UserTable, {
      props: { users: [activeUser] }
    })
    const deactivateButton = wrapper.findAll('button').find(b => b.text() === '無効化')
    await deactivateButton?.trigger('click')
    // 確認前は setActive を emit しない
    expect(wrapper.emitted('setActive')).toBeUndefined()
    // 確認ダイアログのタイトルが body に表示される
    expect(document.body.textContent).toContain('ユーザーを無効化')
  })
})
