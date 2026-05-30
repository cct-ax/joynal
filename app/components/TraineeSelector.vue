<script setup lang="ts">
/**
 * 対象新人セレクタ（新人以外のロールで使う）。
 *
 * - 選択中の新人 ID を v-model（string | null）で双方向バインドする。
 * - options は呼び出し側（report.vue）が用意し、本コンポーネントは表示専用。
 * - admin は初期未選択を表現するため placeholder=true で「選択してください」を出す。
 *
 * raw <select> は使わず @nuxt/ui の USelectMenu を使う。USelectMenu は
 * value-key で単一フィールド（ここでは value=新人 ID）のみを model に流せる。
 *
 * design プロト joynal-mentor-pc.html L946-956（newbieSelector）を Vue 化したもの。
 */
const model = defineModel<string | null>()

const props = defineProps<{
  options: { id: string, name: string }[]
  placeholder?: boolean
}>()

// USelectMenu の items（label 表示 / value=ID）。value-key で model は ID 文字列になる。
const items = computed(() =>
  props.options.map(o => ({ label: o.name, value: o.id }))
)

// USelectMenu は null を受け付けないため、外向き model（string | null）と
// undefined 表現を相互変換するプロキシを噛ませる。
const selected = computed<string | undefined>({
  get: () => model.value ?? undefined,
  set: (v) => {
    model.value = v ?? null
  }
})
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <span class="text-sm text-muted whitespace-nowrap">対象:</span>
    <USelectMenu
      v-model="selected"
      :items="items"
      value-key="value"
      :placeholder="placeholder ? '選択してください' : undefined"
      :search-input="false"
      aria-label="対象の新人"
      class="w-auto min-w-36"
    />
  </div>
</template>
