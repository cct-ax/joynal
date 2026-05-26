<script setup lang="ts">
import type { Profile, DailyReport } from '#shared/types/models'
import type { UserRole } from '#shared/types/api'
import type { ReportWeekday, WeekDayItem } from '~/types/report'

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
const getThisMonday = (): Date => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const currentWeekStart = ref(getThisMonday())
const DAY_LABELS: readonly ReportWeekday[] = ['月', '火', '水', '木', '金']
const DEFAULT_DAY_LABEL: ReportWeekday = '月'
const MAX_MOOD = 5

const weekDays = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + index)
    return date
  })
)

const weekLabel = computed(() => {
  const weekStart = currentWeekStart.value
  const weekEnd = weekDays.value.at(-1)!
  const formatMonthDay = (date: Date) =>
    `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`
  return `${weekStart.getFullYear()}/${formatMonthDay(weekStart)}（月）〜 ${formatMonthDay(weekEnd)}（金）`
})

const prevWeek = () => {
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() - 7)
  currentWeekStart.value = date
}

const nextWeek = () => {
  if (!canGoNextWeek.value) {
    return
  }

  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() + 7)
  currentWeekStart.value = date
}

const goToThisWeek = () => {
  currentWeekStart.value = getThisMonday()
}

const formatDate = (date: Date) =>
  `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`

const toDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const canGoNextWeek = computed(
  () => toDateString(currentWeekStart.value) < toDateString(getThisMonday())
)

const isCurrentWeek = computed(
  () => toDateString(currentWeekStart.value) === toDateString(getThisMonday())
)

// --- 日報データ ---
// key: 'YYYY-MM-DD', value: daily_report レコード
const reports = ref<Record<string, DailyReport>>({})
// TODO: currentWeekStart と対象ユーザーID をもとに日報を取得して reports に格納する
//   $fetch('/api/reports', { query: { weekStart: toDateString(currentWeekStart.value), userId: selectedTraineeId.value ?? undefined } })
//   取得した配列を Record<string, DailyReport> に変換: Object.fromEntries(data.map(r => [r.date, r]))

// --- コメントデータ ---
const mentorComment = ref<string | null>(null)
const ojtComment = ref<string | null>(null)
// TODO: currentWeekStart と selectedTraineeId をもとにコメントを取得する
//   $fetch('/api/comments', { query: { weekStart: toDateString(currentWeekStart.value), traineeId: selectedTraineeId.value } })

// --- モーダル ---
// TODO: 日報入力・編集モーダルの open/close 制御と選択中の日付状態を実装する（新人用）
// TODO: 日報詳細モーダルの open/close 制御と選択中のレコード状態を実装する（メンター・OJT用）

const showTraineeSelector = computed(() => role.value && role.value !== 'trainee')
const showEmptyAdminMessage = computed(() => role.value === 'admin' && !selectedTraineeId.value)

const weekDayItems = computed<WeekDayItem[]>(() => {
  const todayKey = toDateString(new Date())
  return weekDays.value.map((date, index) => {
    const dateKey = toDateString(date)
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
  <div class="min-h-[calc(100vh-52px)] bg-[#f9fafb] px-4 py-5 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[960px] space-y-4">
      <!-- 新人セレクター（メンター・OJT・管理者のみ） -->
      <UCard
        v-if="showTraineeSelector"
        :ui="{
          root: 'rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
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
            :ui="{ base: 'w-full' }"
          />
        </UFormField>
      </UCard>

      <!-- 管理者で新人未選択の場合 -->
      <UCard
        v-if="showEmptyAdminMessage"
        :ui="{
          root: 'rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
          body: 'flex min-h-72 items-center justify-center p-8 text-center'
        }"
      >
        <p class="text-sm text-[#6b7280]">
          表示したい新人の日報を選んでください
        </p>
      </UCard>

      <template v-else>
        <!-- 週ナビゲーション -->
        <UCard
          :ui="{
            root: 'overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="border-b border-[#e5e7eb] p-3 sm:p-4">
            <div
              class="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_auto] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <UButton
                type="button"
                color="primary"
                variant="outline"
                class="h-9 w-9 cursor-pointer justify-center !border-[#c7d2fe] !bg-white px-0 !text-[#4f46e5] !ring-1 !ring-[#c7d2fe] hover:!bg-[#eef2ff] hover:!ring-[#c7d2fe] focus:!ring-4 focus:!ring-[#c7d2fe] sm:w-auto sm:px-3"
                aria-label="前の週"
                @click="prevWeek"
              >
                <UIcon
                  name="i-lucide-chevron-left"
                  class="size-4 sm:hidden"
                />
                <span class="hidden sm:inline">前の週</span>
              </UButton>

              <div
                class="min-h-9 min-w-0 truncate whitespace-nowrap rounded-md bg-[#f3f4f6] px-2 py-2 text-center text-xs font-medium text-[#111827] sm:px-3 sm:text-sm"
              >
                {{ weekLabel }}
              </div>

              <UButton
                type="button"
                color="primary"
                variant="outline"
                class="h-9 w-9 cursor-pointer justify-center !border-[#c7d2fe] !bg-white px-0 !text-[#4f46e5] !ring-1 !ring-[#c7d2fe] hover:!bg-[#eef2ff] hover:!ring-[#c7d2fe] focus:!ring-4 focus:!ring-[#c7d2fe] disabled:cursor-not-allowed disabled:!border-[#e5e7eb] disabled:!bg-[#f9fafb] disabled:!text-[#9ca3af] disabled:!ring-[#e5e7eb] disabled:hover:!bg-[#f9fafb] sm:w-auto sm:px-3"
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
                variant="soft"
                class="min-h-9 w-auto cursor-pointer justify-center !bg-[#eef2ff] px-3 !text-[#4f46e5] hover:!bg-[#e0e7ff] disabled:cursor-not-allowed disabled:!bg-[#f3f4f6] disabled:!text-[#9ca3af]"
                :disabled="isCurrentWeek"
                @click="goToThisWeek"
              >
                今週
              </UButton>
            </div>
          </div>

          <!-- 週間日報リスト（月〜金） -->
          <div
            class="hidden border-b border-[#e5e7eb] bg-[#f9fafb] text-xs font-semibold tracking-wide text-[#6b7280] md:grid md:grid-cols-[8rem_9rem_minmax(0,1fr)_5rem_5.5rem]"
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
              class="border-b border-[#e5e7eb] bg-white last:border-b-0"
              :class="item.isToday ? 'bg-[#fafafa]' : ''"
            >
              <div class="p-4 md:hidden">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        class="text-[13px] font-semibold"
                        :class="item.isToday ? 'text-[#4f46e5]' : 'text-[#111827]'"
                      >
                        {{ formatDate(item.date) }}（{{ item.weekday }}）
                      </span>
                      <span
                        v-if="item.isToday"
                        class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f46e5]"
                      />
                      <span
                        v-if="item.report"
                        class="truncate text-xs text-[#6b7280]"
                      >
                        {{ item.report.check_in }} 〜 {{ item.report.check_out }}
                      </span>
                      <span
                        v-else
                        class="text-xs text-[#9ca3af]"
                      >
                        未入力
                      </span>
                    </div>

                    <div
                      v-if="item.report"
                      class="mt-1 flex min-w-0 items-center gap-2"
                    >
                      <p class="min-w-0 flex-1 truncate text-[13px] text-[#6b7280]">
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
                          :class="star <= (item.report.mood ?? 0) ? 'text-amber-400' : 'text-[#d1d5db]'"
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
                    :class="item.isToday ? 'text-[#4f46e5]' : 'text-[#111827]'"
                  >
                    {{ formatDate(item.date) }}（{{ item.weekday }}）
                  </span>
                  <span
                    v-if="item.isToday"
                    class="h-1.5 w-1.5 rounded-full bg-[#4f46e5]"
                  />
                </div>

                <div class="text-sm text-[#6b7280] md:px-2 md:py-3">
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
                    class="truncate text-sm text-[#111827]"
                  >
                    {{ trimContent(item.report.content, 80) }}
                  </p>
                  <p
                    v-else
                    class="text-sm text-[#9ca3af]"
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
                      :class="star <= (item.report.mood ?? 0) ? 'text-amber-400' : 'text-[#d1d5db]'"
                    >
                      ★
                    </span>
                  </template>
                  <span
                    v-else
                    class="text-sm text-[#d1d5db]"
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
          <div class="border-t-2 border-[#e5e7eb] p-4 sm:p-5">
            <h2 class="mb-4 text-xs font-semibold tracking-wide text-[#6b7280]">
              週次コメント
            </h2>
            <div class="grid gap-4 md:grid-cols-2">
              <!-- メンターコメント -->
              <section class="rounded-lg bg-[#f3f4f6] p-4">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <UBadge
                    color="success"
                    variant="soft"
                    size="sm"
                    label="メンター"
                  />
                  <h3 class="text-sm font-medium text-[#111827]">
                    メンターコメント
                  </h3>
                </div>
                <!-- TODO: role === 'mentor' の場合はテキストエリアで編集可能にする -->
                <p
                  class="text-sm leading-7"
                  :class="mentorComment ? 'text-[#111827]' : 'italic text-[#9ca3af]'"
                >
                  {{ mentorComment ?? 'コメントはまだありません' }}
                </p>
              </section>

              <!-- OJTコメント -->
              <section class="rounded-lg bg-[#f3f4f6] p-4">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <UBadge
                    color="secondary"
                    variant="soft"
                    size="sm"
                    label="OJT"
                  />
                  <h3 class="text-sm font-medium text-[#111827]">
                    OJTコメント
                  </h3>
                </div>
                <!-- TODO: role === 'ojt' の場合はテキストエリアで編集可能にする -->
                <p
                  class="text-sm leading-7"
                  :class="ojtComment ? 'text-[#111827]' : 'italic text-[#9ca3af]'"
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
