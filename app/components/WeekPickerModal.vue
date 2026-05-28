<script setup lang="ts">
/**
 * 週ピッカーモーダル。
 *
 * - UModal 内に @nuxt/ui の UCalendar（月カレンダー）を表示する。
 * - 日付をクリックすると、その週の月曜日を emit してモーダルを閉じる（週選択）。
 * - 選択中の週は #day スロットでまるごとハイライトする。
 * - 月送り・矢印キー操作・曜日/月の日本語表記は UCalendar と UApp(:locale="ja") に委譲。
 *
 * UCalendar は @internationalized/date の CalendarDate を扱うため、
 * アプリの JS Date とは utils/calendarDate.ts の変換関数で橋渡しする（as 不要）。
 *
 * design プロト L625-708（WeekPickerModal）を Vue 化したもの。
 */
import type { DateValue } from '@internationalized/date'

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

// 現在週の月曜。カレンダーの初期表示月（placeholder）と週ハイライト判定に使う。
const weekMonday = computed(() => toCalendarDate(getMondayOf(props.currentWeek)))
const weekMondayYmd = computed(() => formatYmd(getMondayOf(props.currentWeek)))

// 表示中の月（placeholder）。開くたびに現在週の月にリセットする。
const placeholder = shallowRef<DateValue>(weekMonday.value)
watch(
  () => props.open,
  (opened) => {
    if (opened) placeholder.value = weekMonday.value
  }
)

// その日が選択中の週（月曜起点）に属するか
const isInSelectedWeek = (day: DateValue): boolean =>
  formatYmd(getMondayOf(fromCalendarDate(day))) === weekMondayYmd.value

// 日付クリック → その週の月曜を emit して閉じる。
// model-value は null 固定（単一日選択のハイライトは出さず、#day で週単位に表示する）。
const onSelect = (date: DateValue | null): void => {
  if (!date) return
  emit('select', getMondayOf(fromCalendarDate(date)))
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
      <div class="flex justify-center">
        <UCalendar
          v-model:placeholder="placeholder"
          :model-value="null"
          :week-starts-on="1"
          :year-controls="false"
          @update:model-value="onSelect"
        >
          <template #day="{ day }">
            <span
              class="flex items-center justify-center size-full rounded-sm"
              :class="{ 'bg-indigo-50 dark:bg-indigo-950/40 font-semibold': isInSelectedWeek(day) }"
            >
              {{ day.day }}
            </span>
          </template>
        </UCalendar>
      </div>
    </template>
  </UModal>
</template>
