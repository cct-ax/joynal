<script setup lang="ts">
/**
 * 週ナビゲーション。
 *
 * - 前の週 / 次の週ボタン、週ラベル、（今週でない時のみ）今週ボタン。
 * - 週ラベルをクリックで WeekPickerModal を開く（任意の週へジャンプ）。
 * - PC は「← 前の週」テキスト付き、SP はアイコンのみ（`sm:` で切替）。
 *
 * design プロト L711-751（WeekNav）を Vue 化したもの。
 *
 * 使い方:
 *   <WeekNavigator v-model="currentWeekStart" />
 */
const props = defineProps<{
  modelValue: Date
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Date]
}>()

const pickerOpen = ref(false)

const thisMonday = computed(() => getMondayOf(new Date()))
const isToday = computed(
  () => formatYmd(props.modelValue) === formatYmd(thisMonday.value)
)
const weekLabel = computed(() => formatWeekLabel(props.modelValue))

const goPrev = (): void => {
  emit('update:modelValue', addDays(props.modelValue, -7))
}
const goNext = (): void => {
  emit('update:modelValue', addDays(props.modelValue, 7))
}
const goThisWeek = (): void => {
  emit('update:modelValue', thisMonday.value)
}
const onPickWeek = (date: Date): void => {
  emit('update:modelValue', getMondayOf(date))
}
</script>

<template>
  <div class="flex items-center gap-2 w-full flex-wrap">
    <UButton
      variant="outline"
      size="sm"
      icon="i-lucide-chevron-left"
      aria-label="前の週"
      @click="goPrev"
    >
      <span class="hidden sm:inline">前の週</span>
    </UButton>

    <button
      type="button"
      class="flex-1 sm:flex-none text-center px-3 py-1.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-sm font-medium tabular-nums border-b border-dashed border-indigo-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors motion-reduce:transition-none cursor-pointer"
      :aria-label="`週を選択（現在: ${weekLabel}）`"
      @click="pickerOpen = true"
    >
      {{ weekLabel }}
    </button>

    <UButton
      variant="outline"
      size="sm"
      trailing-icon="i-lucide-chevron-right"
      aria-label="次の週"
      @click="goNext"
    >
      <span class="hidden sm:inline">次の週</span>
    </UButton>

    <UButton
      v-if="!isToday"
      variant="soft"
      size="sm"
      @click="goThisWeek"
    >
      今週
    </UButton>

    <WeekPickerModal
      v-model:open="pickerOpen"
      :current-week="modelValue"
      @select="onPickWeek"
    />
  </div>
</template>
