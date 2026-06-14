<script setup lang="ts">
import { MOOD_VALUES, isMoodValue, type MoodValue } from '#shared/types/api'

type MoodStarsSize = 'xs' | 'sm' | 'md'
const MOOD_LABEL = '気分'
const GAP_CLASS_BY_SIZE: Record<MoodStarsSize, string> = {
  xs: 'gap-0.5',
  sm: 'gap-0.5',
  md: 'gap-1'
}
const BUTTON_SIZE_CLASS_BY_SIZE: Record<MoodStarsSize, string> = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-8'
}
const ICON_SIZE_CLASS_BY_SIZE: Record<MoodStarsSize, string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-5'
}

const props = withDefaults(defineProps<{
  modelValue?: number | null
  readonly?: boolean
  size?: MoodStarsSize
}>(), {
  modelValue: undefined,
  readonly: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: MoodValue | null]
}>()

const selectedValue = computed<MoodValue | undefined>(() =>
  isMoodValue(props.modelValue) ? props.modelValue : undefined
)

const hoveredValue = ref<MoodValue | null>(null)
const displayValue = computed<MoodValue | undefined>(() =>
  hoveredValue.value ?? selectedValue.value
)

const gapClass = computed(() => GAP_CLASS_BY_SIZE[props.size])
const buttonSizeClass = computed(() => BUTTON_SIZE_CLASS_BY_SIZE[props.size])
const iconSizeClass = computed(() => ICON_SIZE_CLASS_BY_SIZE[props.size])

const readonlyLabel = computed(() => {
  if (!selectedValue.value) {
    return `${MOOD_LABEL}: 未選択`
  }

  return `${MOOD_LABEL}: ${selectedValue.value} / ${MOOD_VALUES.length}`
})

const isActive = (value: MoodValue): boolean =>
  displayValue.value !== undefined && value <= displayValue.value

const getButtonLabel = (value: MoodValue): string => {
  const base = `${MOOD_LABEL}: ${value} / ${MOOD_VALUES.length}`
  return selectedValue.value === value ? `${base} 選択中。もう一度押すと解除` : base
}

const selectMood = (value: MoodValue) => {
  if (props.readonly) {
    return
  }

  emit('update:modelValue', selectedValue.value === value ? null : value)
}
</script>

<template>
  <div
    class="inline-flex items-center"
    :class="gapClass"
    :role="props.readonly ? 'img' : 'group'"
    :aria-label="props.readonly ? readonlyLabel : MOOD_LABEL"
  >
    <template v-if="props.readonly">
      <UIcon
        v-for="value in MOOD_VALUES"
        :key="value"
        name="i-lucide-star"
        :class="[
          iconSizeClass,
          isActive(value) ? 'fill-current text-warning' : 'fill-transparent text-dimmed'
        ]"
      />
    </template>

    <button
      v-for="value in MOOD_VALUES"
      v-else
      :key="value"
      type="button"
      class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="[
        buttonSizeClass,
        isActive(value) ? 'text-warning' : 'text-dimmed'
      ]"
      :aria-label="getButtonLabel(value)"
      :aria-pressed="selectedValue === value"
      @click="selectMood(value)"
      @mouseenter="hoveredValue = value"
      @mouseleave="hoveredValue = null"
    >
      <UIcon
        name="i-lucide-star"
        aria-hidden="true"
        :class="[
          iconSizeClass,
          isActive(value) ? 'fill-current' : 'fill-transparent'
        ]"
      />
    </button>
  </div>
</template>
