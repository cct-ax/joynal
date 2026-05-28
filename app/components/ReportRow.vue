<script setup lang="ts">
/**
 * 日報リスト 1 行分のコンポーネント。
 *
 * - 新人ロール: 未入力ならペンアイコンで入力モーダル起動、入力済みなら編集モーダル起動。
 * - 他ロール（mentor/ojt/admin）: 入力済みのみ展開ボタンを表示し、行クリックで詳細展開。
 * - PC/SP は CSS-only で切替（`max-sm:`/`sm:`）。JS の isMobile 判定は使わない。
 *
 * design プロト L754-836（DayRow）を Vue 化したもの。土日は親側で渡さない設計のため
 * このコンポーネントで weekend filter はしない。
 */
import type { UserRole } from '#shared/types/api'
import type { DailyReport } from '#shared/types/models'

const props = defineProps<{
  date: Date
  report: DailyReport | null
  role: UserRole
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  inputReport: [date: Date]
  editReport: [report: DailyReport]
  toggleDetail: [date: Date]
}>()

const hasReport = computed(() => props.report !== null)
const isTrainee = computed(() => props.role === 'trainee')
const isToday = computed(() => formatYmd(props.date) === formatYmd(new Date()))

// DAY_LABELS は月〜金。月曜=0 なので getDay() を月曜起点にシフト
const dayLabel = computed(() => {
  const idx = (props.date.getDay() + 6) % 7
  return DAY_LABELS[idx] ?? ''
})

const onRowClick = (): void => {
  if (hasReport.value && !isTrainee.value) {
    emit('toggleDetail', props.date)
  }
}

const onActionClick = (): void => {
  if (isTrainee.value) {
    if (props.report) emit('editReport', props.report)
    else emit('inputReport', props.date)
    return
  }
  if (hasReport.value) emit('toggleDetail', props.date)
}
</script>

<template>
  <!-- PC レイアウト -->
  <div class="max-sm:hidden border-b border-gray-200 dark:border-gray-800">
    <div
      class="flex items-center min-h-12 transition-colors"
      :class="{
        'bg-gray-50 dark:bg-gray-900/50': isToday,
        'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900': hasReport && !isTrainee
      }"
      @click="onRowClick"
    >
      <div class="w-32 shrink-0 px-4 py-2.5 flex items-center gap-2">
        <span
          class="text-sm"
          :class="{ 'text-indigo-600 font-semibold': isToday }"
        >
          {{ formatMonthDay(date) }}（{{ dayLabel }}）
        </span>
        <span
          v-if="isToday"
          class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600"
          aria-label="今日"
        />
      </div>

      <div class="w-36 shrink-0 px-2 py-2.5 text-sm text-gray-500 dark:text-gray-400">
        <template v-if="report">
          {{ report.check_in }} 〜 {{ report.check_out }}
        </template>
        <template v-else>
          ——
        </template>
      </div>

      <div
        class="flex-1 px-2 py-2.5 text-sm overflow-hidden whitespace-nowrap text-ellipsis"
        :class="hasReport ? '' : 'text-gray-400'"
      >
        <template v-if="report">
          {{ report.content.slice(0, 80) }}{{ report.content.length > 80 ? '…' : '' }}
        </template>
        <template v-else>
          未入力
        </template>
      </div>

      <div class="w-20 shrink-0 px-2 py-2.5 flex justify-center">
        <MoodStars
          v-if="report?.mood"
          :model-value="report.mood"
          readonly
          size="sm"
        />
      </div>

      <div
        class="w-24 shrink-0 px-3 py-2.5 flex justify-end"
        @click.stop
      >
        <UButton
          v-if="isTrainee"
          variant="ghost"
          size="sm"
          icon="i-lucide-pencil"
          :aria-label="hasReport ? '日報を編集' : '日報を入力'"
          @click="onActionClick"
        />
        <UButton
          v-else-if="hasReport"
          variant="ghost"
          size="sm"
          :icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :aria-label="isExpanded ? '詳細を閉じる' : '詳細を開く'"
          @click="emit('toggleDetail', date)"
        />
      </div>
    </div>

    <!-- 詳細展開（PC） -->
    <div
      v-if="isExpanded && report"
      class="px-5 py-4 bg-indigo-50/30 dark:bg-indigo-950/20 border-t border-gray-200 dark:border-gray-800"
    >
      <div class="flex flex-wrap gap-4 mb-3 text-sm">
        <span class="text-gray-500 dark:text-gray-400">
          出勤 <strong class="text-gray-900 dark:text-gray-100">{{ report.check_in }}</strong>
        </span>
        <span class="text-gray-500 dark:text-gray-400">
          退勤 <strong class="text-gray-900 dark:text-gray-100">{{ report.check_out }}</strong>
        </span>
        <span
          v-if="report.mood"
          class="flex items-center gap-1 text-gray-500 dark:text-gray-400"
        >
          気分 <MoodStars
            :model-value="report.mood"
            readonly
            size="sm"
          />
        </span>
      </div>
      <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {{ report.content }}
      </p>
    </div>
  </div>

  <!-- SP レイアウト -->
  <div class="sm:hidden border-b border-gray-200 dark:border-gray-800">
    <div
      class="px-4 py-3"
      :class="{
        'bg-gray-50 dark:bg-gray-900/50': isToday,
        'cursor-pointer': hasReport && !isTrainee
      }"
      @click="onRowClick"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span
            class="text-sm font-semibold whitespace-nowrap"
            :class="{ 'text-indigo-600': isToday }"
          >
            {{ formatMonthDay(date) }}（{{ dayLabel }}）
          </span>
          <span
            v-if="report"
            class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
          >
            {{ report.check_in }} 〜 {{ report.check_out }}
          </span>
          <span
            v-else
            class="text-xs text-gray-400"
          >
            未入力
          </span>
        </div>
        <div @click.stop>
          <UButton
            v-if="isTrainee"
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            :aria-label="hasReport ? '日報を編集' : '日報を入力'"
            @click="onActionClick"
          />
          <UButton
            v-else-if="hasReport"
            variant="ghost"
            size="xs"
            :icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            :aria-label="isExpanded ? '詳細を閉じる' : '詳細を開く'"
            @click="emit('toggleDetail', date)"
          />
        </div>
      </div>
      <div
        v-if="report && !isExpanded"
        class="flex items-center gap-2 mt-1"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap text-ellipsis flex-1">
          {{ report.content.slice(0, 60) }}{{ report.content.length > 60 ? '…' : '' }}
        </p>
        <MoodStars
          v-if="report.mood"
          :model-value="report.mood"
          readonly
          size="xs"
        />
      </div>
    </div>
    <!-- SP 詳細展開 -->
    <div
      v-if="isExpanded && report"
      class="px-4 py-3 bg-indigo-50/30 dark:bg-indigo-950/20"
    >
      <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {{ report.content }}
      </p>
    </div>
  </div>
</template>
