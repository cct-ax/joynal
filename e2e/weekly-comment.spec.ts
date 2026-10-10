import { test, expect } from '@playwright/test'
import { USERS, login } from './fixtures'

/**
 * 週次コメント upsert の E2E（mentor）。
 *
 * mentor でログインすると、担当新人（seed の mentor_assignments で割り当て済み）が
 * 自動で先頭選択される（useAssignedTrainees は mentor/ojt の先頭を既定選択）。担当が 1 人
 * だけなのでセレクタは名前の静的表示になり、当週のコメント欄が表示される。
 *
 * メンター欄の「入力」ボタンからモーダルを開き、本文を入力して保存する。保存後はコメントが
 * 表示に反映され、ボタンが「入力」→「編集」に変わることを確認する（= upsert 成立）。
 */
test.describe('週次コメント（mentor）', () => {
  test('担当新人の当週コメントを入力して保存できる', async ({ page }) => {
    await login(page, 'mentor')

    // 担当新人が自動選択され、コメント欄まで描画されるのを待つ。
    await expect(page.getByText('週次コメント')).toBeVisible()
    await expect(page.getByText(USERS.trainee.name)).toBeVisible()

    const comment = 'E2E メンターコメント: 今週もよく取り組めていました。来週も継続しましょう。'

    // メンター欄の「入力」ボタン（未入力時のラベル）からモーダルを開く。
    await page.getByRole('button', { name: '入力' }).first().click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByText('週次コメントを入力')).toBeVisible()

    await modal.getByLabel('コメント').fill(comment)
    await modal.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('コメントを保存しました')).toBeVisible()
    // 保存内容が欄に反映される。
    await expect(page.getByText(comment)).toBeVisible()
    // upsert により以後は「編集」に変わる（既存コメントがある状態）。
    await expect(page.getByRole('button', { name: '編集' }).first()).toBeVisible()
  })
})
