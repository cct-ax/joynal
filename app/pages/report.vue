<script setup lang="ts">
import { getLocalTimeZone, parseDate, type DateValue } from '@internationalized/date'
import type { Profile, DailyReport } from '#shared/types/models'
import type { UserRole } from '#shared/types/api'
import type { ReportWeekday, WeekDayItem } from '#shared/types/report'

// --- ロール & 対象新人 ---
// TODO: useCurrentUser() composable を使ってロールを取得する（Supabase 直接呼び出しは禁止）
// const { role: currentRole, isTrainee, isMentor, isOjt, isAdmin, pending } = useCurrentUser()
const role = ref<UserRole | null>('trainee')
const selectedTraineeId = ref<string | undefined>(undefined)
const trainees = ref<Pick<Profile, 'id' | 'name'>[]>([])
const traineeSelectItems = computed(() =>
  trainees.value.map(trainee => ({
    label: trainee.name,
    value: trainee.id
  }))
)

// TODO: ロール取得後、$fetch を使って担当新人一覧を取得して trainees に格納する
//   メンター・OJT: $fetch('/api/assignments/me', { query: { year } }) → trainee フィールドを展開
//   管理者: $fetch('/api/users') → role === 'trainee' のみフィルタ

// --- 週ナビゲーション ---
// 日付/週ロジックは shared/utils/date.ts の共通関数を使う（auto-import・重複実装を避ける）。
const currentWeekStart = ref(getMondayOf(new Date()))
const weekCalendarOpen = ref(false)
const DAY_LABELS: readonly ReportWeekday[] = ['月', '火', '水', '木', '金']
const DEFAULT_DAY_LABEL: ReportWeekday = '月'
const MAX_MOOD = 5

const weekDays = computed(() => getWeekDays(currentWeekStart.value))

const weekLabel = computed(() => formatWeekLabel(currentWeekStart.value))

const prevWeek = () => {
  currentWeekStart.value = addDays(currentWeekStart.value, -7)
}

const nextWeek = () => {
  if (!canGoNextWeek.value) {
    return
  }

  currentWeekStart.value = addDays(currentWeekStart.value, 7)
}

const goToThisWeek = () => {
  currentWeekStart.value = getMondayOf(new Date())
}

const calendarValue = computed<DateValue | undefined>({
  get: () => parseDate(formatYmd(currentWeekStart.value)),
  set: (value) => {
    if (!value) {
      return
    }

    const selectedWeekStart = getMondayOf(value.toDate(getLocalTimeZone()))
    const thisMonday = getMondayOf(new Date())
    const selectedWeekKey = formatYmd(selectedWeekStart)
    const thisWeekKey = formatYmd(thisMonday)
    currentWeekStart.value = selectedWeekKey > thisWeekKey ? thisMonday : selectedWeekStart
    weekCalendarOpen.value = false
  }
})

const maxCalendarValue = computed(() => parseDate(formatYmd(addDays(getMondayOf(new Date()), 4))))

const isCalendarDateInSelectedWorkWeek = (date: DateValue): boolean => {
  const dateKey = formatYmd(date.toDate(getLocalTimeZone()))
  const weekStartKey = formatYmd(currentWeekStart.value)
  const weekEndKey = formatYmd(addDays(currentWeekStart.value, 4))
  return dateKey >= weekStartKey && dateKey <= weekEndKey
}

const isCalendarDateSelectedWeekStart = (date: DateValue): boolean =>
  formatYmd(date.toDate(getLocalTimeZone())) === formatYmd(currentWeekStart.value)

const getCalendarDayClass = (date: DateValue): string => {
  if (isCalendarDateSelectedWeekStart(date)) {
    return 'flex size-7 items-center justify-center rounded-full bg-primary font-semibold text-inverted'
  }
  if (isCalendarDateInSelectedWorkWeek(date)) {
    return 'flex size-7 items-center justify-center rounded-full bg-primary/10 font-medium text-primary'
  }
  return 'flex size-7 items-center justify-center rounded-full'
}

const getCalendarWeekDayClass = (day: string): string => {
  if (day.includes('土')) {
    return 'text-info'
  }
  if (day.includes('日')) {
    return 'text-error'
  }
  return 'text-default'
}

const canGoNextWeek = computed(
  () => formatYmd(currentWeekStart.value) < formatYmd(getMondayOf(new Date()))
)

const isCurrentWeek = computed(
  () => formatYmd(currentWeekStart.value) === formatYmd(getMondayOf(new Date()))
)

// --- 日報データ ---
// key: 'YYYY-MM-DD', value: daily_report レコード
const reports = ref<Record<string, DailyReport>>({})
// TODO: currentWeekStart と対象ユーザーID をもとに日報を取得して reports に格納する
//   $fetch('/api/reports', { query: { weekStart: formatYmd(currentWeekStart.value), userId: selectedTraineeId.value ?? undefined } })
//   取得した配列を Record<string, DailyReport> に変換: Object.fromEntries(data.map(r => [r.date, r]))

// --- コメントデータ ---
const mentorComment = ref<string | null>(null)
const ojtComment = ref<string | null>(null)
// TODO: currentWeekStart と selectedTraineeId をもとにコメントを取得する
//   $fetch('/api/comments', { query: { weekStart: formatYmd(currentWeekStart.value), traineeId: selectedTraineeId.value } })

// --- モーダル ---
// TODO: 日報入力・編集モーダルの open/close 制御と選択中の日付状態を実装する（新人用）
// TODO: 日報詳細モーダルの open/close 制御と選択中のレコード状態を実装する（メンター・OJT用）

const showTraineeSelector = computed(() => role.value && role.value !== 'trainee')
const showEmptyAdminMessage = computed(() => role.value === 'admin' && !selectedTraineeId.value)

const weekDayItems = computed<WeekDayItem[]>(() => {
  const todayKey = formatYmd(new Date())
  return weekDays.value.map((date, index) => {
    const dateKey = formatYmd(date)
    return {
      date,
      dateKey,
      weekday: DAY_LABELS[index] ?? DEFAULT_DAY_LABEL,
      report: reports.value[dateKey],
      isToday: dateKey === todayKey
    }
  })
})

const trimContent = (content: string, maxLength: number): string =>
  content.length > maxLength ? `${content.slice(0, maxLength)}...` : content

const moodStars = computed(() => Array.from({ length: MAX_MOOD }, (_, index) => index + 1))
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-muted px-4 py-5 text-default sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[960px] space-y-4">
      <!-- 新人セレクター（メンター・OJT・管理者のみ） -->
      <UCard
        v-if="showTraineeSelector"
        class="shadow-sm"
        :ui="{
          body: 'p-4'
        }"
      >
        <UFormField
          label="対象"
          name="trainee-selector"
        >
          <USelect
            id="trainee-selector"
            v-model="selectedTraineeId"
            :items="traineeSelectItems"
            value-key="value"
            label-key="label"
            placeholder="新人を選択してください"
            class="w-full sm:max-w-xs"
          />
        </UFormField>
      </UCard>

      <!-- 管理者で新人未選択の場合 -->
      <UCard
        v-if="showEmptyAdminMessage"
        class="shadow-sm"
        :ui="{
          body: 'flex min-h-72 items-center justify-center p-8 text-center'
        }"
      >
        <p class="text-sm text-muted">
          表示したい新人の日報を選んでください
        </p>
      </UCard>

      <template v-else>
        <!-- 週ナビゲーション -->
        <UCard
          class="shadow-sm"
          :ui="{
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="border-b border-default p-3 sm:p-4">
            <div
              class="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_auto] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <UButton
                type="button"
                color="primary"
                variant="outline"
                class="h-9 w-9 cursor-pointer justify-center px-0 sm:w-auto sm:px-3"
                aria-label="前の週"
                @click="prevWeek"
              >
                <UIcon
                  name="i-lucide-chevron-left"
                  class="size-4 sm:hidden"
                />
                <span class="hidden sm:inline">前の週</span>
              </UButton>

              <UPopover
                v-model:open="weekCalendarOpen"
                :content="{ align: 'center', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
              >
                <UButton
                  type="button"
                  color="neutral"
                  variant="soft"
                  class="min-h-9 w-full min-w-0 cursor-pointer justify-center rounded-md px-2 py-2 text-center text-xs font-medium sm:px-3 sm:text-sm"
                  aria-label="週をカレンダーで選択"
                >
                  <span class="min-w-0 truncate whitespace-nowrap">
                    {{ weekLabel }}
                  </span>
                  <UIcon
                    name="i-lucide-calendar-days"
                    class="ml-1 size-4 shrink-0 text-muted"
                  />
                </UButton>

                <template #content>
                  <div class="p-2">
                    <UCalendar
                      v-model="calendarValue"
                      :max-value="maxCalendarValue"
                      :week-starts-on="1"
                      prevent-deselect
                      color="primary"
                      variant="subtle"
                      size="sm"
                      :ui="{
                        root: 'min-w-[17.5rem]',
                        body: 'pt-3',
                        headCell: 'font-semibold',
                        cellTrigger: 'data-[selected]:bg-transparent data-[selected]:text-inherit data-[selected]:ring-0'
                      }"
                    >
                      <template #week-day="{ day }">
                        <span :class="getCalendarWeekDayClass(day)">
                          {{ day }}
                        </span>
                      </template>
                      <template #day="{ day }">
                        <span :class="getCalendarDayClass(day)">
                          {{ day.day }}
                        </span>
                      </template>
                    </UCalendar>
                  </div>
                </template>
              </UPopover>

              <UButton
                type="button"
                color="primary"
                variant="outline"
                class="h-9 w-9 cursor-pointer justify-center px-0 sm:w-auto sm:px-3"
                :disabled="!canGoNextWeek"
                aria-label="次の週"
                @click="nextWeek"
              >
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 sm:hidden"
                />
                <span class="hidden sm:inline">次の週</span>
              </UButton>

              <UButton
                type="button"
                color="primary"
                variant="soft"
                class="min-h-9 w-auto cursor-pointer justify-center px-3"
                :disabled="isCurrentWeek"
                @click="goToThisWeek"
              >
                今週
              </UButton>
            </div>
          </div>

          <!-- 週間日報リスト（月〜金） -->
          <div
            class="hidden border-b border-default bg-muted text-xs font-semibold tracking-wide text-muted md:grid md:grid-cols-[8rem_9rem_minmax(0,1fr)_5rem_5.5rem]"
          >
            <div class="px-4 py-2">
              日付
            </div>
            <div class="px-2 py-2">
              出退勤
            </div>
            <div class="px-2 py-2">
              やったこと
            </div>
            <div class="px-2 py-2 text-center">
              気分
            </div>
            <div class="px-3 py-2" />
          </div>

          <div>
            <article
              v-for="item in weekDayItems"
              :key="item.dateKey"
              class="border-b border-default last:border-b-0"
              :class="item.isToday ? 'bg-elevated/50' : 'bg-default'"
            >
              <div class="p-4 md:hidden">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        class="text-[13px] font-semibold"
                        :class="item.isToday ? 'text-primary' : 'text-highlighted'"
                      >
                        {{ formatMonthDay(item.date) }}（{{ item.weekday }}）
                      </span>
                      <span
                        v-if="item.isToday"
                        class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span
                        v-if="item.report"
                        class="truncate text-xs text-muted"
                      >
                        {{ item.report.check_in }} 〜 {{ item.report.check_out }}
                      </span>
                      <span
                        v-else
                        class="text-xs text-dimmed"
                      >
                        未入力
                      </span>
                    </div>

                    <div
                      v-if="item.report"
                      class="mt-1 flex min-w-0 items-center gap-2"
                    >
                      <p class="min-w-0 flex-1 truncate text-[13px] text-muted">
                        {{ trimContent(item.report.content, 60) }}
                      </p>
                      <div
                        v-if="item.report.mood"
                        class="flex shrink-0 items-center gap-0.5"
                      >
                        <span
                          v-for="star in moodStars"
                          :key="star"
                          class="text-xs"
                          :class="star <= (item.report.mood ?? 0) ? 'text-warning' : 'text-dimmed'"
                        >
                          ★
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="shrink-0">
                    <!-- 新人: 未入力→「入力」、入力済み→「編集」 -->
                    <template v-if="role === 'trainee'">
                      <UButton
                        v-if="!item.report"
                        type="button"
                        icon="i-lucide-pencil"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        square
                        class="cursor-pointer"
                        aria-label="日報を入力"
                        title="日報を入力"
                      >
                        <!-- TODO: 入力モーダルを開く -->
                      </UButton>
                      <UButton
                        v-else
                        type="button"
                        icon="i-lucide-pencil"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        square
                        class="cursor-pointer"
                        aria-label="日報を編集"
                        title="日報を編集"
                      >
                        <!-- TODO: 編集モーダルを開く -->
                      </UButton>
                    </template>

                    <!-- メンター・OJT・管理者: 入力済みの行のみ「詳細」 -->
                    <template v-else-if="item.report">
                      <UButton
                        type="button"
                        label="詳細"
                        color="primary"
                        variant="outline"
                        size="sm"
                        class="cursor-pointer"
                      >
                        <!-- TODO: 詳細モーダルを開く -->
                      </UButton>
                    </template>
                  </div>
                </div>
              </div>

              <div
                class="hidden md:grid md:grid-cols-[8rem_9rem_minmax(0,1fr)_5rem_5.5rem] md:items-center md:gap-0"
              >
                <div class="flex items-center gap-2 md:px-4 md:py-3">
                  <span
                    class="text-sm font-medium"
                    :class="item.isToday ? 'text-primary' : 'text-highlighted'"
                  >
                    {{ formatMonthDay(item.date) }}（{{ item.weekday }}）
                  </span>
                  <span
                    v-if="item.isToday"
                    class="h-1.5 w-1.5 rounded-full bg-primary"
                  />
                </div>

                <div class="text-sm text-muted md:px-2 md:py-3">
                  <template v-if="item.report">
                    {{ item.report.check_in }} 〜 {{ item.report.check_out }}
                  </template>
                  <template v-else>
                    --
                  </template>
                </div>

                <div class="min-w-0 md:px-2 md:py-3">
                  <p
                    v-if="item.report"
                    class="truncate text-sm text-default"
                  >
                    {{ trimContent(item.report.content, 80) }}
                  </p>
                  <p
                    v-else
                    class="text-sm text-dimmed"
                  >
                    未入力
                  </p>
                </div>

                <div class="flex items-center gap-0.5 md:justify-center md:px-2 md:py-3">
                  <template v-if="item.report?.mood">
                    <span
                      v-for="star in moodStars"
                      :key="star"
                      class="text-sm"
                      :class="star <= (item.report.mood ?? 0) ? 'text-warning' : 'text-dimmed'"
                    >
                      ★
                    </span>
                  </template>
                  <span
                    v-else
                    class="text-sm text-dimmed"
                  > -- </span>
                </div>

                <div class="flex justify-end md:px-3 md:py-3">
                  <!-- 新人: 未入力→「入力」、入力済み→「編集」 -->
                  <template v-if="role === 'trainee'">
                    <UButton
                      v-if="!item.report"
                      type="button"
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      class="cursor-pointer"
                      aria-label="日報を入力"
                      title="日報を入力"
                    >
                      <!-- TODO: 入力モーダルを開く -->
                    </UButton>
                    <UButton
                      v-else
                      type="button"
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      class="cursor-pointer"
                      aria-label="日報を編集"
                      title="日報を編集"
                    >
                      <!-- TODO: 編集モーダルを開く -->
                    </UButton>
                  </template>

                  <!-- メンター・OJT・管理者: 入力済みの行のみ「詳細」 -->
                  <template v-else-if="item.report">
                    <UButton
                      type="button"
                      label="詳細"
                      color="primary"
                      variant="outline"
                      size="sm"
                      class="cursor-pointer"
                    >
                      <!-- TODO: 詳細モーダルを開く -->
                    </UButton>
                  </template>
                </div>
              </div>
            </article>
          </div>

          <!-- 週次コメントエリア -->
          <div class="border-t-2 border-default p-4 sm:p-5">
            <h2 class="mb-4 text-xs font-semibold tracking-wide text-muted">
              週次コメント
            </h2>
            <div class="grid gap-4 md:grid-cols-2">
              <!-- メンターコメント -->
              <section class="rounded-lg bg-elevated p-4">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <UBadge
                    color="success"
                    variant="soft"
                    size="sm"
                    label="メンター"
                  />
                  <h3 class="text-sm font-medium text-highlighted">
                    メンターコメント
                  </h3>
                </div>
                <!-- TODO: role === 'mentor' の場合はテキストエリアで編集可能にする -->
                <p
                  class="text-sm leading-7"
                  :class="mentorComment ? 'text-default' : 'italic text-dimmed'"
                >
                  {{ mentorComment ?? 'コメントはまだありません' }}
                </p>
              </section>

              <!-- OJTコメント -->
              <section class="rounded-lg bg-elevated p-4">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <UBadge
                    color="secondary"
                    variant="soft"
                    size="sm"
                    label="OJT"
                  />
                  <h3 class="text-sm font-medium text-highlighted">
                    OJTコメント
                  </h3>
                </div>
                <!-- TODO: role === 'ojt' の場合はテキストエリアで編集可能にする -->
                <p
                  class="text-sm leading-7"
                  :class="ojtComment ? 'text-default' : 'italic text-dimmed'"
                >
                  {{ ojtComment ?? 'コメントはまだありません' }}
                </p>
              </section>
            </div>
          </div>
        </UCard>
      </template>

      <!-- TODO: 日報入力・編集モーダルコンポーネントをここに配置する（新人用） -->
      <!-- TODO: 日報詳細モーダルコンポーネントをここに配置する（メンター・OJT用） -->
    </div>
  </div>
</template>
