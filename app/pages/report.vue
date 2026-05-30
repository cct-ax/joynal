<script setup lang="ts">
/**
 * 日報画面（全ロール共通レイアウト）。
 *
 * - 週ナビ → 月〜金の ReportRow → CommentArea の縦並び。
 * - trainee: 自分の日報を CRUD し、その週の mentor/ojt コメントを閲覧する。
 * - mentor/ojt/admin: 担当新人セレクタで対象を選び、日報を週単位で閲覧する。
 *   mentor/ojt は CommentInputModal で週次コメントを入力・編集できる。
 * - 取得・選択ロジックは composable に委譲し、本ページは配線に徹する:
 *   - useAssignedTrainees（セレクタの状態）
 *   - useWeeklyReports（週次日報）
 *   - useWeeklyComments（週次コメント＝mentor/ojt 振り分け）
 */
import type { DailyReport } from '#shared/types/models'

const { role, profile, isMentor, isOjt, pending: profilePending } = useCurrentUser()

// 週ナビ用の状態（「今週月曜」計算を 1 箇所に集約）
const { currentWeekStart, weekDays, weekStartYmd } = useWeekNavigation()

// 担当新人セレクタ（非 trainee のみ取得・表示）
const { traineeOptions, selectedTraineeId, pending: assigneesPending } = useAssignedTrainees()

const isTrainee = computed(() => role.value === 'trainee')

// 対象 ID の派生:
// - 日報の userId: trainee は送らず RLS に委譲、それ以外は選択中の新人
// - コメントの traineeId: trainee は自分自身、それ以外は選択中の新人
const reportUserId = computed<string | undefined>(() =>
  isTrainee.value ? undefined : (selectedTraineeId.value ?? undefined)
)
const commentTraineeId = computed<string | null>(() =>
  isTrainee.value ? (profile.value?.id ?? null) : selectedTraineeId.value
)
// trainee は常に取得、それ以外は新人が選択されているときだけ取得する
const reportsEnabled = computed(() => isTrainee.value || selectedTraineeId.value !== null)

const { reportByDate, refresh: refreshReports, status: reportsStatus } = useWeeklyReports(
  weekStartYmd,
  reportUserId,
  reportsEnabled
)
const { mentorComment, ojtComment, refresh: refreshComments } = useWeeklyComments(
  weekStartYmd,
  commentTraineeId
)

// 詳細展開（mentor/ojt/admin で使う、新人は使わない）
const expandedDate = ref<string | null>(null)
const onToggleDetail = (date: Date): void => {
  const ymd = formatYmd(date)
  expandedDate.value = expandedDate.value === ymd ? null : ymd
}
// 対象新人が変わったら展開状態をリセットする（プロト準拠）
watch(selectedTraineeId, () => {
  expandedDate.value = null
})

// reports/comments は server:false でクライアント取得するため、SSR と hydration 初期は
// 必ずスケルトンを描画してボード全体のハイドレーションずれを構造的に避ける（mounted ゲート）。
// マウント後は profile/assignments の取得状況と reports の取得状況（idle/pending）で判定する。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const isLoading = computed(
  () =>
    !mounted.value
    || profilePending.value
    || assigneesPending.value
    || reportsStatus.value === 'idle'
    || reportsStatus.value === 'pending'
)

// 担当新人が 1 件以上いるか。mentor/ojt が担当 0 件のときは
// 自分で割り当てできないため、専用の空状態（管理者に連絡）を出す。
const hasTrainees = computed(() => traineeOptions.value.length > 0)
const mentorNoTrainees = computed(() => (isMentor.value || isOjt.value) && !hasTrainees.value)

// 非 trainee はセレクタを表示。ただし mentor/ojt が担当 0 件のときは
// 空のセレクタを出しても選べないので隠す。
// 未選択（admin 初期）のときは空状態を出し、表は描画しない。
const showSelector = computed(() => !isTrainee.value && !mentorNoTrainees.value)
const showEmpty = computed(() => !isTrainee.value && selectedTraineeId.value === null)

// 日報入力・編集モーダル（trainee のみが操作起点）。
// selectedDate を立てれば開く、null に戻せば閉じる。
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

// 週次コメント入力モーダル（mentor/ojt のみ）。
// CommentArea が emit する target（＝自分のロール）で開く。
const editingCommentRole = ref<'mentor' | 'ojt' | null>(null)
const isCommentModalOpen = computed({
  get: () => editingCommentRole.value !== null,
  set: (v: boolean) => {
    if (!v) editingCommentRole.value = null
  }
})
const editingComment = computed(() => {
  if (editingCommentRole.value === 'mentor') return mentorComment.value
  if (editingCommentRole.value === 'ojt') return ojtComment.value
  return null
})
const onEditComment = (target: 'mentor' | 'ojt'): void => {
  editingCommentRole.value = target
}
const onCommentSaved = async (): Promise<void> => {
  await refreshComments()
}
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

  <div
    v-else
    class="space-y-6"
  >
    <!-- 担当新人セレクタ（mentor/ojt/admin） -->
    <TraineeSelector
      v-if="showSelector"
      v-model="selectedTraineeId"
      :options="traineeOptions"
      :placeholder="selectedTraineeId === null"
    />

    <!-- mentor/ojt は担当0件: 自分で割り当てできないので管理者に連絡を促す -->
    <EmptyState
      v-if="mentorNoTrainees"
      emoji="📋"
      message="担当の新人がまだ割り当てられていません。管理者にお問い合わせください。"
    />

    <!-- TODO(MS4): admin は全新人(role=trainee)をセレクタに出し、新人0件のときは「管理画面で新人を追加」CTA(/admin)を表示する -->
    <!-- admin 初期など未選択のときは空状態 -->
    <EmptyState
      v-else-if="showEmpty"
      emoji="📋"
      message="閲覧する新人を選択してください"
    />

    <UCard
      v-else
      :ui="{ body: 'p-0 sm:p-0' }"
    >
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

    <!-- 週次コメント入力モーダル（mentor/ojt） -->
    <CommentInputModal
      v-if="commentTraineeId"
      v-model:open="isCommentModalOpen"
      :week-start="currentWeekStart"
      :trainee-id="commentTraineeId"
      :target-role="editingCommentRole ?? 'mentor'"
      :existing="editingComment"
      @saved="onCommentSaved"
    />
  </div>
</template>
