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
 * USelectMenu（内部は Reka Combobox）は value='' を「プレースホルダ/クリア」用に予約しており、
 * 空文字の項目を許さない（A <ComboboxItem /> must have a non-empty value）。
 * そのため非空の番兵を使い、外向き model の null と相互変換する。
 */
const NONE = '__unassigned__'

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
  <!-- 列構成は admin.vue のヘッダー（新人 flex-1 / メンター w-44 / OJT w-44・px-4 gap-3）と揃える。
       モバイルは縦積みにし、ヘッダーが隠れる分インラインラベルを出す。 -->
  <div
    class="flex items-center gap-3 px-4 py-3 border-b border-default max-sm:flex-col max-sm:items-stretch max-sm:gap-2"
  >
    <!-- 新人名 -->
    <div class="flex-1 min-w-0 text-sm font-medium truncate max-sm:font-semibold">
      {{ traineeName }}
    </div>

    <!-- メンター選択 -->
    <div class="w-44 shrink-0 max-sm:w-full">
      <span class="sm:hidden mb-1 block text-xs text-muted">メンター</span>
      <USelectMenu
        v-model="selectedMentor"
        :items="mentorItems"
        value-key="value"
        :search-input="false"
        :aria-label="`${traineeName} のメンター`"
        class="w-full"
      />
    </div>

    <!-- OJT 選択 -->
    <div class="w-44 shrink-0 max-sm:w-full">
      <span class="sm:hidden mb-1 block text-xs text-muted">OJT</span>
      <USelectMenu
        v-model="selectedOjt"
        :items="ojtItems"
        value-key="value"
        :search-input="false"
        :aria-label="`${traineeName} の OJT`"
        class="w-full"
      />
    </div>
  </div>
</template>
