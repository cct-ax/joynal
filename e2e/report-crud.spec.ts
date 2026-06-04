import { test, expect, type Page, type Locator } from '@playwright/test'
import { login } from './fixtures'

/**
 * 日報 CRUD の E2E（trainee）。
 *
 * 当週の最初の平日行（月曜）のペンボタンから入力モーダルを開き、出退勤時刻・やったことを
 * 入力して作成 → 内容を編集 → 削除する一連の流れを RLS 越しの実 UI で確認する。
 *
 * 設計メモ:
 *   - 日付は行ごとに固定（モーダルの date は行クリックで決まる）。当週の平日に対して操作する。
 *   - 出退勤は @nuxt/ui の UInputTime（reka-ui TimeField）。<input type="time"> ではなく
 *     hour / minute の各セグメントが role="spinbutton" でレンダリングされる。fill() は効かないため、
 *     spinbutton を順にフォーカスして数字をキー入力する（下の fillTimes ヘルパー）。
 *   - 保存・更新・削除はトーストの文言で完了を確認し、行の表示内容でも反映を確認する。
 */

// 入力モーダル内の UInputTime（reka-ui TimeField）の各セグメント（role="spinbutton"）に
// 時刻を入力する。hour-cycle=24 のため各フィールドは [hour, minute] の 2 セグメント。
// モーダルには出勤・退勤の 2 フィールドがあり、DOM 順に
//   [0]=出勤 hour [1]=出勤 minute [2]=退勤 hour [3]=退勤 minute
// となる。group の aria ラベル解決に依存せず DOM 順インデックスで扱う（より安定）。
// セグメントにフォーカスして数字をタイプすると値が確定し、次セグメントへ自動移動する。
const fillTimes = async (
  modal: Locator,
  checkIn: string,
  checkOut: string
): Promise<void> => {
  const segments = modal.getByRole('spinbutton')
  const [inHh = '', inMm = ''] = checkIn.split(':')
  const [outHh = '', outMm = ''] = checkOut.split(':')
  await segments.nth(0).click()
  await segments.nth(0).pressSequentially(inHh)
  await segments.nth(1).pressSequentially(inMm)
  await segments.nth(2).click()
  await segments.nth(2).pressSequentially(outHh)
  await segments.nth(3).pressSequentially(outMm)
}

// 当週の「最初の平日行」を表す行ロケータ（PC レイアウトを対象に操作する）。
// 行内のペンボタンで入力/編集モーダルを開く。
const firstWeekdayPencil = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: label }).first()

test.describe('日報 CRUD（trainee）', () => {
  test('日報を作成 → 編集 → 削除できる', async ({ page }) => {
    await login(page, 'trainee')

    const created = 'E2E 作成: 環境構築とコードリーディング'
    const edited = 'E2E 編集: テストの追加とレビュー対応'

    // --- 作成 ---
    // 当週の未入力行（最初の平日）のペン（aria-label='日報を入力'）から入力モーダルを開く。
    await firstWeekdayPencil(page, '日報を入力').click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByText('日報を入力')).toBeVisible()

    await fillTimes(modal, '09:00', '18:00')
    await modal.getByLabel('やったこと').fill(created)
    await modal.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('日報を保存しました')).toBeVisible()
    // 行に作成した内容が反映される。ReportRow は PC / SP の 2 レイアウトを CSS で出し分けるため
    // 同テキストが DOM に 2 つ存在しうる。表示中の方を first() で確認する。
    await expect(page.getByText(created).first()).toBeVisible()

    // --- 編集 ---
    // 入力済みになった行のペンは aria-label='日報を編集' に変わる。
    await firstWeekdayPencil(page, '日報を編集').click()
    const editModal = page.getByRole('dialog')
    await expect(editModal.getByText('日報を編集')).toBeVisible()

    const contentField = editModal.getByLabel('やったこと')
    await contentField.fill(edited)
    await editModal.getByRole('button', { name: '更新' }).click()

    await expect(page.getByText('日報を更新しました')).toBeVisible()
    await expect(page.getByText(edited).first()).toBeVisible()

    // --- 削除 ---
    await firstWeekdayPencil(page, '日報を編集').click()
    const deleteModal = page.getByRole('dialog')
    await deleteModal.getByRole('button', { name: '削除' }).click()
    // ConfirmDialog の確認ボタン（同じく '削除'）を押す。確認ダイアログは別 dialog として開く。
    const confirm = page.getByRole('dialog').filter({ hasText: 'この日報を削除します' })
    await confirm.getByRole('button', { name: '削除' }).click()

    await expect(page.getByText('日報を削除しました')).toBeVisible()
    // 削除後は当該内容が DOM から消える（PC / SP 両レイアウトとも）。toBeHidden は CSS で
    // 隠れているだけの SP 側にも一致してしまうため、件数 0 で「存在しない」ことを確認する。
    await expect(page.getByText(edited)).toHaveCount(0)
  })
})
