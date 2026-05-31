<script setup lang="ts">
/**
 * 気分（mood）の星評価コンポーネント。
 *
 * - 1〜5 の値を表示・編集。
 * - readonly=true なら表示専用（一覧/詳細で使う）。各星は `<span>`（非インタラクティブ）で
 *   描画し、値は group の aria-label で読み上げる。これにより clickable な行（トグルボタン）の
 *   中に置いてもネストボタンにならない。
 * - 同じ星を再クリックすると null（未入力）に戻る。
 * - ホバー時は一時的にその位置までハイライト。
 *
 * アイコンは @iconify/vue の <Icon> を使う。動的なクラス制御（fill 状態切替）が
 * UIcon 経由よりも素直なため。
 */
import { Icon } from '@iconify/vue'
import { MOOD_VALUES, type MoodValue } from '#shared/types/api'

const props = withDefaults(
  defineProps<{
    /** DailyReport.mood が number | null のため受け取り側は緩めに許容する */
    modelValue: MoodValue | number | null | undefined
    /** true のとき表示専用（クリック・ホバー不可） */
    readonly?: boolean
    /** 星アイコンのサイズ */
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { readonly: false, size: 'md' }
)

const emit = defineEmits<{
  /** 解除（再クリック）時は null、選択時は MoodValue を返す */
  'update:modelValue': [value: MoodValue | null]
}>()

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

// 以下のハンドラは editable 時のみ v-on で束ねる（readonly は span でハンドラ無し）
const onClick = (n: MoodValue): void => {
  emit('update:modelValue', props.modelValue === n ? null : n)
}

const onMouseEnter = (n: number): void => {
  hoveredValue.value = n
}

const onMouseLeave = (): void => {
  hoveredValue.value = null
}
</script>

<template>
  <div
    class="inline-flex gap-0.5 items-center"
    role="group"
    :aria-label="`気分 ${modelValue ?? 0} / 5`"
  >
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="n in MOOD_VALUES"
      :key="n"
      :type="readonly ? undefined : 'button'"
      class="leading-none transition-transform motion-reduce:transition-none"
      :class="{
        'cursor-pointer hover:scale-110 motion-reduce:hover:scale-100': !readonly,
        'cursor-default': readonly
      }"
      :aria-label="readonly ? undefined : `気分 ${n}`"
      v-on="readonly ? {} : { click: () => onClick(n), mouseenter: () => onMouseEnter(n), mouseleave: onMouseLeave }"
    >
      <Icon
        :icon="n <= displayValue ? 'mdi:star' : 'mdi:star-outline'"
        aria-hidden="true"
        :class="[
          sizeClass,
          n <= displayValue ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
        ]"
      />
    </component>
  </div>
</template>
