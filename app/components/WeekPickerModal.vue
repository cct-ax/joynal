<script setup lang="ts">
/**
 * 週ピッカーモーダル。
 *
 * - 月カレンダーを表示し、週単位で選択（その週の月曜日を emit する）。
 * - 月送りボタンで前後の月へ移動。
 * - 現在週はハイライト、今日はテキスト強調。
 *
 * design プロト L625-708（WeekPickerModal）を Vue 化したもの。
 */
const props = defineProps<{
  open: boolean
  currentWeek: Date
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [value: Date]
}>()

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v)
})

const viewYear = ref(props.currentWeek.getFullYear())
const viewMonth = ref(props.currentWeek.getMonth())

// 開くたびに currentWeek に合わせて view を初期化
watch(
  () => props.open,
  (opened) => {
    if (opened) {
      viewYear.value = props.currentWeek.getFullYear()
      viewMonth.value = props.currentWeek.getMonth()
    }
  }
)

const prevMonth = (): void => {
  if (viewMonth.value === 0) {
    viewYear.value -= 1
    viewMonth.value = 11
  } else {
    viewMonth.value -= 1
  }
}
const nextMonth = (): void => {
  if (viewMonth.value === 11) {
    viewYear.value += 1
    viewMonth.value = 0
  } else {
    viewMonth.value += 1
  }
}

// カレンダーグリッド（月～日の 7 列、複数週）
const weeks = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  // 月曜起点に正規化（日曜=6、月曜=0）
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear.value, viewMonth.value, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const result: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    result.push(cells.slice(i, i + 7))
  }
  return result
})

const todayStr = computed(() => formatYmd(new Date()))
const currentWeekStr = computed(() => formatYmd(props.currentWeek))

const getWeekMonStr = (week: (Date | null)[]): string | null => {
  const mondayCell = week.find(d => d && d.getDay() === 1) ?? week.find(d => d)
  return mondayCell ? formatYmd(getMondayOf(mondayCell)) : null
}

const onWeekClick = (week: (Date | null)[]): void => {
  const ws = getWeekMonStr(week)
  if (!ws) return
  const monday = parseYmd(ws)
  if (monday) emit('select', monday)
  openModel.value = false
}
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="週を選択"
    :ui="{ content: 'sm:max-w-xs' }"
  >
    <template #body>
      <div>
        <!-- 月ヘッダー -->
        <div class="flex items-center justify-between mb-3">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-chevron-left"
            aria-label="前の月"
            @click="prevMonth"
          />
          <span class="font-semibold text-sm">
            {{ viewYear }}年 {{ MONTHS[viewMonth] }}
          </span>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-chevron-right"
            aria-label="次の月"
            @click="nextMonth"
          />
        </div>

        <!-- 曜日ヘッダー -->
        <div class="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-1">
          <div
            v-for="(d, idx) in DAY_HEADER_MON_START"
            :key="d"
            :class="{
              'text-cyan-600': idx === 5,
              'text-red-600': idx === 6,
              'text-gray-500 dark:text-gray-400': idx < 5
            }"
          >
            {{ d }}
          </div>
        </div>

        <!-- 週ごとの行（クリックで選択） -->
        <div class="flex flex-col gap-0.5">
          <button
            v-for="(week, wi) in weeks"
            :key="wi"
            type="button"
            class="grid grid-cols-7 gap-1 rounded-sm cursor-pointer transition-colors"
            :class="{
              'bg-indigo-50 dark:bg-indigo-950/40': getWeekMonStr(week) === currentWeekStr,
              'hover:bg-gray-100 dark:hover:bg-gray-800': getWeekMonStr(week) !== currentWeekStr
            }"
            :aria-label="`週 ${getWeekMonStr(week) ?? ''} を選択`"
            @click="onWeekClick(week)"
          >
            <span
              v-for="(d, di) in week"
              :key="di"
              class="text-center text-sm py-1.5 rounded-sm"
              :class="{
                'text-transparent select-none': !d,
                'text-indigo-600 font-bold': d && formatYmd(d) === todayStr,
                'text-gray-400': d && (d.getDay() === 0 || d.getDay() === 6) && formatYmd(d) !== todayStr,
                'font-semibold': d && getWeekMonStr(week) === currentWeekStr
              }"
            >
              {{ d ? d.getDate() : '·' }}
            </span>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
