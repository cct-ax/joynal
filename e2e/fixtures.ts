import { type Page, expect } from '@playwright/test'

/**
 * E2E 用テストユーザーとログインヘルパー。
 *
 * - ユーザーは supabase/seed.sql が投入する（auth.users + profiles + mentor_assignments）。
 *   email / role / id は seed と完全に一致させること。
 * - パスワードは seed 側の bcrypt ハッシュの元になる平文。E2E 専用の捨てアカウントなので
 *   spec 内定数として保持する（本番資格情報ではない）。CI でも同じ値を seed が使う。
 */
export const E2E_PASSWORD = 'Passw0rd!e2e'

export const USERS = {
  trainee: {
    email: 'trainee@e2e.test',
    name: 'E2E 新人',
    role: 'trainee'
  },
  mentor: {
    email: 'mentor@e2e.test',
    name: 'E2E メンター',
    role: 'mentor'
  },
  admin: {
    email: 'admin@e2e.test',
    name: 'E2E 管理者',
    role: 'admin'
  }
} as const

export type UserKey = keyof typeof USERS

/**
 * /login からフォーム送信してログインし、/report への遷移を待つ。
 *
 * login.vue は成功後 navigateTo('/report', { external: true }) でフルリロードするため、
 * URL が /report になるまで待ってからアサーションを進める。
 */
export const login = async (page: Page, user: UserKey): Promise<void> => {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(USERS[user].email)
  await page.getByLabel('パスワード').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).toHaveURL(/\/report$/)
}
