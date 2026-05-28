<script setup lang="ts">
/**
 * 気分（mood）の星評価コンポーネント。
 *
 * - 1〜5 の値を表示・編集。
 * - readonly=true なら表示専用（一覧で使う）。
 * - 同じ星を再クリックすると null（未入力）に戻る。
 * - ホバー時は一時的にその位置までハイライト。
 *
 * アイコンは @iconify/vue の <Icon> を使う。動的なクラス制御（fill 状態切替）が
 * UIcon 経由よりも素直なため。
 */
import { Icon } from '@iconify/vue'
import type { MoodValue } from '#shared/types/api'

const props = withDefaults(
  defineProps<{
    /** DailyReport.mood が number | null のため受け取り側は緩めに許容する */
    modelValue: MoodValue | number | null | undefined
    readonly?: boolean
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { readonly: false, size: 'md' }
)

const emit = defineEmits<{
  /** 解除（再クリック）時は null、選択時は MoodValue を返す */
  'update:modelValue': [value: MoodValue | null]
}>()

const STARS = [1, 2, 3, 4, 5] as const

const hoveredValue = ref<number | null>(null)

const displayValue = computed(() => hoveredValue.value ?? props.modelValue ?? 0)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3 h-3'
    case 'sm':
      return 'w-4 h-4'
    default:
      return 'w-5 h-5'
  }
})

const onClick = (n: MoodValue): void => {
  if (props.readonly) return
  emit('update:modelValue', props.modelValue === n ? null : n)
}

const onMouseEnter = (n: number): void => {
  if (!props.readonly) hoveredValue.value = n
}

const onMouseLeave = (): void => {
  if (!props.readonly) hoveredValue.value = null
}
</script>

<template>
  <div
    class="inline-flex gap-0.5 items-center"
    :aria-label="`気分 ${modelValue ?? 0} / 5`"
  >
    <button
      v-for="n in STARS"
      :key="n"
      type="button"
      :disabled="readonly"
      class="leading-none transition-transform"
      :class="{
        'cursor-pointer hover:scale-110': !readonly,
        'cursor-default': readonly
      }"
      :aria-label="`気分 ${n}`"
      @click="onClick(n)"
      @mouseenter="onMouseEnter(n)"
      @mouseleave="onMouseLeave"
    >
      <Icon
        :icon="n <= displayValue ? 'mdi:star' : 'mdi:star-outline'"
        :class="[
          sizeClass,
          n <= displayValue ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
        ]"
      />
    </button>
  </div>
</template>
