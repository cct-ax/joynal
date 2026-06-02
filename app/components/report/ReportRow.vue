<script setup lang="ts">
/**
 * 日報リスト 1 行分のコンポーネント。
 *
 * - 報告がある行はどのロールでも「開示トグル」になり、コンテンツ領域をクリック/Enter/Space で
 *   詳細を展開する（design プロト DayRow と同じ＝ロール非依存）。
 * - 新人ロールは加えてペンで入力/編集モーダルを起動する。
 * - PC/SP は CSS-only で切替（`max-sm:`/`sm:`）。JS の isMobile 判定は使わない。
 *   行本体・トグル・詳細パネルは単一の DOM ツリーで表現し、表示の違いだけを
 *   `max-sm:`/`sm:` のユーティリティで出し分ける（旧版の PC/SP 二重レイアウトを統合）。
 *
 * a11y: トグルは「行全体」ではなく**コンテンツ領域だけ**を `<button aria-expanded aria-controls>`
 * にし（`<component :is>`）、ペン/chevron はその外側（兄弟）に置く。こうすることで
 * `<button>` の中に別の `<button>`（ペン・星）が入るネストを避けつつ、`<div @click>` の
 * キーボード非対応アンチパターンも避ける。装飾的な chevron は `aria-hidden`。
 * 単一のトグル button から PC/SP 両方の詳細パネルを制御するため、aria-controls は
 * 両パネル id をスペース区切りで指す（ARIA は IDREF リストを許容）。詳細パネルの
 * 開閉は `<Transition>` で transform/opacity のみアニメーションし、`prefers-reduced-motion`
 * を尊重する。配色は @nuxt/ui の semantic トークン（today は primary）。
 *
 * design プロト L754-836（DayRow）を Vue 化したもの。土日は親側で渡さない設計のため
 * このコンポーネントで weekend filter はしない。
 */
import type { UserRole } from '#shared/types/api'
import type { DailyReport } from '#shared/types/models'

const props = defineProps<{
  /** この行が表す日付 */
  date: Date
  /** その日の日報（未入力時は null） */
  report: DailyReport | null
  /** 現在のユーザーロール（trainee のみ編集ペンを表示） */
  role: UserRole
  /** 詳細展開中かどうか（親が管理する） */
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  /** 未入力の日付で入力モーダルを開く（trainee のみ） */
  inputReport: [date: Date]
  /** 既存日報の編集モーダルを開く（trainee のみ） */
  editReport: [report: DailyReport]
  /** 行の詳細パネル開閉を親に通知 */
  toggleDetail: [date: Date]
}>()

const hasReport = computed(() => props.report !== null)
const isTrainee = computed(() => props.role === 'trainee')
// 報告があれば全ロールで展開可（design 準拠）。トグルはコンテンツ領域の button。
const isExpandable = computed(() => hasReport.value)
const isToday = computed(() => formatYmd(props.date) === formatYmd(new Date()))

// 詳細パネルと aria-controls を結ぶ ID（PC/SP で重複しないよう接尾辞を付ける）
const baseId = useId()
const pcPanelId = computed(() => `${baseId}-pc`)
const spPanelId = computed(() => `${baseId}-sp`)
// 単一 button から PC/SP 両パネルを制御する（ARIA は IDREF リストを許容）。
const panelControls = computed(() => `${pcPanelId.value} ${spPanelId.value}`)

// 曜日ラベルは shared/utils/date の weekdayLabel に集約
const dayLabel = computed(() => weekdayLabel(props.date))

// 本文プレビューは PC=80 字 / SP=60 字で truncate（design 準拠の表示差）。
const pcPreview = computed(() => {
  if (!props.report) return ''
  const { content } = props.report
  return content.slice(0, 80) + (content.length > 80 ? '…' : '')
})
const spPreview = computed(() => {
  if (!props.report) return ''
  const { content } = props.report
  return content.slice(0, 60) + (content.length > 60 ? '…' : '')
})

// コンテンツトグル。展開可能なときにのみ click を束ねる（下の v-on を参照）
const onRowActivate = (): void => {
  emit('toggleDetail', props.date)
}

// 新人のペン操作: 入力済みなら編集、未入力なら新規入力
const onPencil = (): void => {
  if (props.report) emit('editReport', props.report)
  else emit('inputReport', props.date)
}
</script>

<template>
  <div class="border-b border-default">
    <div
      class="grid grid-cols-[1fr_auto] transition-colors motion-reduce:transition-none max-sm:items-start sm:items-center"
      :class="{ 'bg-elevated': isToday, 'hover:bg-elevated': isExpandable }"
    >
      <!-- コンテンツ領域がトグル（ペンは外側）。PC=横一列 / SP=縦積みカード -->
      <component
        :is="isExpandable ? 'button' : 'div'"
        :type="isExpandable ? 'button' : undefined"
        class="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary max-sm:px-4 max-sm:py-3 sm:flex sm:items-center sm:min-h-12 sm:rounded-none max-sm:rounded"
        :class="{ 'cursor-pointer': isExpandable }"
        :aria-expanded="isExpandable ? isExpanded : undefined"
        :aria-controls="isExpandable ? panelControls : undefined"
        :aria-label="isExpandable ? (isExpanded ? '詳細を閉じる' : '詳細を開く') : undefined"
        v-on="isExpandable ? { click: onRowActivate } : {}"
      >
        <!-- SP 上段: 日付 + 出退勤/未入力（PC では日付列のみ担当） -->
        <div class="flex items-center gap-2 min-w-0 sm:w-36 sm:shrink-0 sm:px-4 sm:py-2.5">
          <span
            class="text-sm max-sm:font-semibold whitespace-nowrap"
            :class="{ 'text-primary sm:font-semibold': isToday }"
          >
            {{ formatMonthDay(date) }}（{{ dayLabel }}）
          </span>
          <span
            v-if="isToday"
            class="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0 max-sm:hidden"
            aria-hidden="true"
          />
          <!-- SP のみ: 日付の隣に出退勤/未入力をインライン表示 -->
          <span
            v-if="report"
            class="sm:hidden text-xs text-muted whitespace-nowrap tabular-nums"
          >
            {{ toHm(report.check_in) }} 〜 {{ toHm(report.check_out) }}
          </span>
          <span
            v-else
            class="sm:hidden text-xs text-dimmed"
          >
            未入力
          </span>
        </div>

        <!-- PC のみ: 出退勤の独立列 -->
        <div class="max-sm:hidden w-32 shrink-0 px-2 py-2.5 text-sm text-muted tabular-nums">
          <template v-if="report">
            {{ toHm(report.check_in) }} 〜 {{ toHm(report.check_out) }}
          </template>
          <template v-else>
            ——
          </template>
        </div>

        <!-- PC のみ: 本文 80 字（常時表示・1 行 ellipsis） -->
        <div
          class="max-sm:hidden flex-1 min-w-0 px-2 py-2.5 text-sm overflow-hidden whitespace-nowrap text-ellipsis"
          :class="hasReport ? '' : 'text-dimmed'"
        >
          <template v-if="report">
            {{ pcPreview }}
          </template>
          <template v-else>
            未入力
          </template>
        </div>

        <!-- PC のみ: mood 列（中央寄せ・size sm） -->
        <div class="max-sm:hidden w-28 shrink-0 px-2 py-2.5 flex justify-center">
          <MoodStars
            v-if="report?.mood"
            :model-value="report.mood"
            readonly
            size="sm"
          />
        </div>

        <!-- SP のみ: 下段の本文 60 字 + mood（未展開時のみ） -->
        <div
          v-if="report && !isExpanded"
          class="sm:hidden flex items-center gap-2 mt-1"
        >
          <p class="text-sm text-muted overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
            {{ spPreview }}
          </p>
          <MoodStars
            v-if="report.mood"
            :model-value="report.mood"
            readonly
            size="xs"
          />
        </div>
      </component>

      <!-- 操作（ペン）はトグル button の外側。PC=w-20 右寄せ / SP=コンパクト -->
      <div class="flex justify-end items-center sm:w-20 sm:px-3 max-sm:px-3 max-sm:py-3">
        <UButton
          v-if="isTrainee"
          variant="ghost"
          icon="i-lucide-pencil"
          size="sm"
          :aria-label="hasReport ? '日報を編集' : '日報を入力'"
          @click="onPencil"
        />
        <UIcon
          v-else-if="isExpandable"
          name="i-lucide-chevron-down"
          class="text-dimmed transition-transform motion-reduce:transition-none max-sm:size-4 sm:size-5"
          aria-hidden="true"
          :class="{ 'rotate-180': isExpanded }"
        />
      </div>
    </div>

    <!-- 詳細展開（PC: メタ行＋本文 / SP: 本文のみ）。CSS で片方ずつ表示する -->
    <div
      v-if="report"
      class="max-sm:hidden"
    >
      <ReportRowDetail
        :report="report"
        variant="pc"
        :panel-id="pcPanelId"
        :is-open="isExpanded ?? false"
      />
    </div>
    <div
      v-if="report"
      class="sm:hidden"
    >
      <ReportRowDetail
        :report="report"
        variant="sp"
        :panel-id="spPanelId"
        :is-open="isExpanded ?? false"
      />
    </div>
  </div>
</template>
