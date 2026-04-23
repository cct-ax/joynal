<script setup lang="ts">
import type { Tables } from '~/types/database.types'

type Profile = Tables<'profiles'>
type DailyReport = Tables<'daily_reports'>
type Role = 'trainee' | 'mentor' | 'ojt' | 'admin'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// --- ロール & 対象新人 ---
const role = ref<Role | null>(null)
const selectedTraineeId = ref<string | null>(null)
const trainees = ref<Pick<Profile, 'id' | 'name'>[]>([])

// TODO: ログインユーザーのロールを profiles テーブルから取得して role に格納する
// TODO: メンター・OJT は担当新人を mentor_assignments から、管理者は全新人を profiles から取得して trainees に格納する

// --- 週ナビゲーション ---
function getThisMonday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const currentWeekStart = ref(getThisMonday())

const weekDays = computed(() =>
  Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
)

const weekLabel = computed(() => {
  const s = currentWeekStart.value
  const e = weekDays.value.at(-1)!
  const fmt = (d: Date) => `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
  return `${s.getFullYear()}/${fmt(s)}（月）〜 ${fmt(e)}（金）`
})

function prevWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function goToThisWeek() {
  currentWeekStart.value = getThisMonday()
}

const DAY_LABELS = ['月', '火', '水', '木', '金'] as const

function formatDate(d: Date) {
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

// --- 日報データ ---
// key: 'YYYY-MM-DD', value: daily_report レコード
const reports = ref<Record<string, DailyReport>>({})
// TODO: currentWeekStart と対象ユーザーID をもとに daily_reports テーブルから取得して reports に格納する

// --- コメントデータ ---
const mentorComment = ref<string | null>(null)
const ojtComment = ref<string | null>(null)
// TODO: currentWeekStart と selectedTraineeId をもとに comments テーブルから取得する

// --- モーダル ---
// TODO: 日報入力・編集モーダルの open/close 制御と選択中の日付状態を実装する（新人用）
// TODO: 日報詳細モーダルの open/close 制御と選択中のレコード状態を実装する（メンター・OJT用）

const showTraineeSelector = computed(() => role.value && role.value !== 'trainee')
const showEmptyAdminMessage = computed(() => role.value === 'admin' && !selectedTraineeId.value)

// supabase・user は TODO のデータ取得処理で使用する
void supabase
void user
</script>

<template>
  <div>
    <!-- 新人セレクター（メンター・OJT・管理者のみ） -->
    <div v-if="showTraineeSelector">
      <label>対象:</label>
      <select v-model="selectedTraineeId">
        <option
          value=""
          disabled
        >
          新人を選択してください
        </option>
        <option
          v-for="t in trainees"
          :key="t.id"
          :value="t.id"
        >
          {{ t.name }}
        </option>
      </select>
    </div>

    <!-- 管理者で新人未選択の場合 -->
    <div v-if="showEmptyAdminMessage">
      <p>表示したい新人の日報を選んでください</p>
    </div>

    <template v-else>
      <!-- 週ナビゲーション -->
      <div>
        <button @click="prevWeek">
          ＜ 前の週
        </button>
        <span>{{ weekLabel }}</span>
        <button @click="goToThisWeek">
          今週
        </button>
        <button @click="nextWeek">
          次の週 ＞
        </button>
      </div>

      <!-- 週間日報リスト（月〜金） -->
      <table>
        <tbody>
          <tr
            v-for="(day, i) in weekDays"
            :key="i"
          >
            <!-- 日付・曜日 -->
            <td>{{ formatDate(day) }}（{{ DAY_LABELS[i] }}）</td>

            <!-- 出勤〜退勤・やったこと -->
            <td>
              <template v-if="reports[toDateString(day)]">
                {{ reports[toDateString(day)]?.check_in }} 〜 {{ reports[toDateString(day)]?.check_out }}
                <br>
                {{ reports[toDateString(day)]?.content.slice(0, 100) }}
              </template>
              <template v-else>
                --
              </template>
            </td>

            <!-- ロール別操作ボタン -->
            <td>
              <!-- 新人: 未入力→「入力」、入力済み→「編集」 -->
              <template v-if="role === 'trainee'">
                <button v-if="!reports[toDateString(day)]">
                  <!-- TODO: 入力モーダルを開く -->
                  入力
                </button>
                <button v-else>
                  <!-- TODO: 編集モーダルを開く -->
                  編集
                </button>
              </template>

              <!-- メンター・OJT・管理者: 入力済みの行のみ「詳細」 -->
              <template v-else-if="reports[toDateString(day)]">
                <button>
                  <!-- TODO: 詳細モーダルを開く -->
                  詳細
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 週次コメントエリア -->
      <div>
        <!-- メンターコメント -->
        <div>
          <h3>メンターコメント</h3>
          <!-- TODO: role === 'mentor' の場合はテキストエリアで編集可能にする -->
          <p>{{ mentorComment ?? 'コメントはまだありません' }}</p>
        </div>

        <!-- OJTコメント -->
        <div>
          <h3>OJTコメント</h3>
          <!-- TODO: role === 'ojt' の場合はテキストエリアで編集可能にする -->
          <p>{{ ojtComment ?? 'コメントはまだありません' }}</p>
        </div>
      </div>
    </template>

    <!-- TODO: 日報入力・編集モーダルコンポーネントをここに配置する（新人用） -->
    <!-- TODO: 日報詳細モーダルコンポーネントをここに配置する（メンター・OJT用） -->
  </div>
</template>
