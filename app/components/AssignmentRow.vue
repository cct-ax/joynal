<script setup lang="ts">
/**
 * 担当割り当て管理テーブルの1行コンポーネント。
 *
 * - 新人名を表示し、メンター・OJT をそれぞれ USelectMenu で選択できる。
 * - 「未割り当て」を明示的な選択肢として表示し、選択すると model が null になる。
 * - デスクトップでは横スクロールテーブル内の行、モバイルでは縦積みレイアウト両対応の
 *   シンプルな flex/grid 行として機能する（レイアウトは親が担う）。
 *
 * design プロト docs/design/ を参照。
 */
import type { PersonOption } from '#shared/types/api'

const props = defineProps<{
  traineeName: string
  mentorOptions: PersonOption[]
  ojtOptions: PersonOption[]
}>()

/** メンター選択（null = 未割り当て） */
const mentorId = defineModel<string | null>('mentorId')
/** OJT 選択（null = 未割り当て） */
const ojtId = defineModel<string | null>('ojtId')

/**
 * "未割り当て" を表すセンチネル値。
 * USelectMenu は null を value-key で扱えないため、空文字列にマップする。
 */
const NONE = '' as const

type SelectItem = { label: string, value: string }

/**
 * USelectMenu の items リスト生成ヘルパー。
 * 先頭に「未割り当て」を追加し、残りを PersonOption から変換する。
 */
const toItems = (options: PersonOption[]): SelectItem[] => [
  { label: '未割り当て', value: NONE },
  ...options.map(o => ({ label: o.name, value: o.id }))
]

const mentorItems = computed<SelectItem[]>(() => toItems(props.mentorOptions))
const ojtItems = computed<SelectItem[]>(() => toItems(props.ojtOptions))

/**
 * null ↔ NONE の相互変換プロキシ（メンター）。
 * TraineeSelector の null ↔ undefined パターンを踏襲し、
 * 空文字列（NONE）選択を外向き model の null に変換する。
 */
const selectedMentor = computed<string>({
  get: () => mentorId.value ?? NONE,
  set: (v: string) => {
    mentorId.value = v === NONE ? null : v
  }
})

/**
 * null ↔ NONE の相互変換プロキシ（OJT）。
 */
const selectedOjt = computed<string>({
  get: () => ojtId.value ?? NONE,
  set: (v: string) => {
    ojtId.value = v === NONE ? null : v
  }
})
</script>

<template>
  <div class="grid grid-cols-[1fr_1fr_1fr] items-center gap-x-4 gap-y-2 py-2 min-w-0 sm:flex sm:flex-wrap sm:gap-2">
    <!-- 新人名 -->
    <span class="text-sm font-medium truncate">{{ traineeName }}</span>

    <!-- メンター選択 -->
    <USelectMenu
      v-model="selectedMentor"
      :items="mentorItems"
      value-key="value"
      :search-input="false"
      :aria-label="`${traineeName} のメンター`"
      class="w-auto min-w-32"
    />

    <!-- OJT 選択 -->
    <USelectMenu
      v-model="selectedOjt"
      :items="ojtItems"
      value-key="value"
      :search-input="false"
      :aria-label="`${traineeName} の OJT`"
      class="w-auto min-w-32"
    />
  </div>
</template>
