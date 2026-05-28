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

// 1〜5 のみ有効。DB 側の CHECK 制約と一致する。
type MoodStar = 1 | 2 | 3 | 4 | 5
// テンプレートから渡す際の型は緩めて number | null を許容する
type MoodValueIn = number | null | undefined
// emit する値は厳密に 1〜5 または null
type MoodValueOut = MoodStar | null

const props = withDefaults(
  defineProps<{
    modelValue: MoodValueIn
    readonly?: boolean
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { readonly: false, size: 'md' }
)

const emit = defineEmits<{ 'update:modelValue': [value: MoodValueOut] }>()

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

const onClick = (n: MoodStar): void => {
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
