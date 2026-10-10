import { test, expect } from '@playwright/test'
import { E2E_PASSWORD, USERS, login } from './fixtures'

/**
 * 認証フローの E2E。
 *
 * - 未ログインで保護ページ（/report）へアクセスすると /login にリダイレクトされる
 *   （@nuxtjs/supabase の redirect: true による。exclude 対象外のページが対象）。
 * - 正しい資格情報でログインすると /report に遷移する。
 * - 誤った資格情報ではエラートーストが表示され /login に留まる。
 */
test.describe('認証', () => {
  test('未ログインで保護ページにアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/report')
    // redirect_to クエリが付くことがあるためパスの部分一致で待つ。
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
  })

  test('正しい資格情報でログインすると /report に遷移する', async ({ page }) => {
    await login(page, 'trainee')
    await expect(page).toHaveURL(/\/report$/)
  })

  test('誤った資格情報ではエラーが表示されログイン画面に留まる', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(USERS.trainee.email)
    await page.getByLabel('パスワード').fill(`${E2E_PASSWORD}-wrong`)
    await page.getByRole('button', { name: 'ログイン' }).click()

    // login.vue は 401 を「メールアドレスまたはパスワードが正しくありません」のトーストに変換する。
    await expect(
      page.getByText('メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible()
    // 遷移せずログイン画面のまま。
    await expect(page).toHaveURL(/\/login/)
  })
})
