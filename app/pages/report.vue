<script setup lang="ts">
/**
 * 日報画面（全ロール共通レイアウト）。
 *
 * - 週ナビ → 月〜金の ReportRow → CommentArea の縦並び。
 * - MS2 では新人ロールの CRUD を対象とする。
 * - MS3 で以下を接続予定:
 *   - TraineeSelector（メンター/OJT/管理者向け）
 *   - CommentArea の editComment emit → CommentInputModal
 *   - useFetch('/api/comments') による週次コメントの実取得
 */
import type { DailyReport } from '#shared/types/models'
import type { CommentWithCommenter } from '#shared/types/api'

const { role, isAdmin, pending: profilePending } = useCurrentUser()

// 週ナビ用の状態を composable に委譲（「今週月曜」計算を 1 箇所に集約）
const { currentWeekStart, weekDays, weekStartYmd } = useWeekNavigation()

// 詳細展開（mentor/ojt/admin で使う、新人は使わない）
const expandedDate = ref<string | null>(null)

const onToggleDetail = (date: Date): void => {
  const ymd = formatYmd(date)
  expandedDate.value = expandedDate.value === ymd ? null : ymd
}

// useFetch の query。weekStartYmd の変化で自動再フェッチされる。
// MS3 で selectedTraineeId を追加する想定（trainee の場合は省略可）
const reportsQuery = computed(() => ({
  weekStart: weekStartYmd.value
}))

const { data: reports, refresh: refreshReports, status: reportsStatus } = await useFetch<DailyReport[]>(
  '/api/reports',
  { query: reportsQuery, default: () => [] }
)

// プロフィール取得中、または週切り替えで日報を再取得中はスケルトンを表示する
// （role 未解決のまま表を描画しないことで `role ?? 'trainee'` の一時誤表示も防ぐ）
const isLoading = computed(() => profilePending.value || reportsStatus.value === 'pending')

// 日付索引で O(1) 参照
const reportByDate = computed<Record<string, DailyReport>>(() =>
  Object.fromEntries((reports.value ?? []).map(r => [r.date, r]))
)

// MS2 ではコメントは未取得。MS3 で useFetch('/api/comments') を追加する。
const mentorComment = ref<CommentWithCommenter | null>(null)
const ojtComment = ref<CommentWithCommenter | null>(null)

// モーダル制御。selectedDate を立てれば開く、null に戻せば閉じる。
const selectedReport = ref<DailyReport | null>(null)
const selectedDate = ref<string | null>(null)
const isModalOpen = computed({
  get: () => selectedDate.value !== null,
  set: (v: boolean) => {
    if (!v) {
      selectedReport.value = null
      selectedDate.value = null
    }
  }
})

const onInputReport = (date: Date): void => {
  selectedReport.value = null
  selectedDate.value = formatYmd(date)
}
const onEditReport = (report: DailyReport): void => {
  selectedReport.value = report
  selectedDate.value = report.date
}

const onSaved = async (): Promise<void> => {
  await refreshReports()
}
const onDeleted = async (): Promise<void> => {
  await refreshReports()
}

// MS3 で CommentInputModal を接続する。今は noop。
const onEditComment = (_target: 'mentor' | 'ojt'): void => {
  // TODO MS3: CommentInputModal を開く
}

// 管理者は未選択時に EmptyState を表示（MS3 で TraineeSelector 実装後に有効化）
const showEmptyAdminMessage = computed(() => isAdmin.value)
</script>

<template>
  <div
    v-if="isLoading"
    role="status"
    aria-label="読み込み中…"
    class="space-y-6"
  >
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="border-b border-default px-4 py-3">
        <USkeleton class="h-8 w-full max-w-md" />
      </div>
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-4 px-4 py-3.5 border-b border-default"
      >
        <USkeleton class="h-4 w-24 shrink-0" />
        <USkeleton class="h-4 w-28 shrink-0" />
        <USkeleton class="h-4 flex-1" />
      </div>
    </UCard>
  </div>

  <!-- 管理者は MS3 で TraineeSelector + 未選択時の EmptyState を実装予定 -->
  <EmptyState
    v-else-if="showEmptyAdminMessage"
    emoji="📋"
    message="管理者用の新人セレクターは MS3 で実装予定です"
  />

  <div
    v-else
    class="space-y-6"
  >
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <!-- 週ナビ -->
      <div class="border-b border-default px-4 py-3">
        <WeekNavigator v-model="currentWeekStart" />
      </div>

      <!-- テーブルヘッダー（PC のみ） -->
      <div
        class="max-sm:hidden flex items-center bg-muted border-b border-default text-xs font-semibold text-muted uppercase tracking-wider"
      >
        <div class="w-36 shrink-0 px-4 py-2">
          日付
        </div>
        <div class="w-32 shrink-0 px-2 py-2">
          出退勤
        </div>
        <div class="flex-1 px-2 py-2">
          やったこと
        </div>
        <div class="w-28 shrink-0 px-2 py-2 text-center">
          気分
        </div>
        <div class="w-20 shrink-0 px-3 py-2" />
      </div>

      <!-- 月〜金の行 -->
      <ReportRow
        v-for="day in weekDays"
        :key="formatYmd(day)"
        :date="day"
        :report="reportByDate[formatYmd(day)] ?? null"
        :role="role ?? 'trainee'"
        :is-expanded="expandedDate === formatYmd(day)"
        @input-report="onInputReport"
        @edit-report="onEditReport"
        @toggle-detail="onToggleDetail"
      />

      <!-- 週次コメント -->
      <CommentArea
        :week-start="currentWeekStart"
        :mentor-comment="mentorComment"
        :ojt-comment="ojtComment"
        :role="role ?? 'trainee'"
        @edit-comment="onEditComment"
      />
    </UCard>

    <!-- 日報入力・編集モーダル（新人ロールのみが操作起点） -->
    <ReportInputModal
      v-model:open="isModalOpen"
      :date="selectedDate"
      :report="selectedReport"
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </div>
</template>
