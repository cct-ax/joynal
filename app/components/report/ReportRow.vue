<script setup lang="ts">
/**
 * 日報リスト 1 行分のコンポーネント。
 *
 * - 報告がある行はどのロールでも「開示トグル」になり、コンテンツ領域をクリック/Enter/Space で
 *   詳細を展開する（design プロト DayRow と同じ＝ロール非依存）。
 * - 新人ロールは加えてペンで入力/編集モーダルを起動する。
 * - PC/SP は CSS-only で切替（`max-sm:`/`sm:`）。JS の isMobile 判定は使わない。
 *
 * a11y: トグルは「行全体」ではなく**コンテンツ領域だけ**を `<button aria-expanded aria-controls>`
 * にし（`<component :is>`）、ペン/chevron はその外側（兄弟）に置く。こうすることで
 * `<button>` の中に別の `<button>`（ペン・星）が入るネストを避けつつ、`<div @click>` の
 * キーボード非対応アンチパターンも避ける。装飾的な chevron は `aria-hidden`。詳細パネルの
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

// 曜日ラベルは shared/utils/date の weekdayLabel に集約
const dayLabel = computed(() => weekdayLabel(props.date))

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
  <!-- PC レイアウト -->
  <div class="max-sm:hidden border-b border-default">
    <div
      class="grid grid-cols-[1fr_auto] items-center transition-colors motion-reduce:transition-none"
      :class="{ 'bg-elevated': isToday, 'hover:bg-elevated': isExpandable }"
    >
      <!-- コンテンツ領域がトグル（ペンは外側） -->
      <component
        :is="isExpandable ? 'button' : 'div'"
        :type="isExpandable ? 'button' : undefined"
        class="flex items-center min-h-12 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        :class="{ 'cursor-pointer': isExpandable }"
        :aria-expanded="isExpandable ? isExpanded : undefined"
        :aria-controls="isExpandable ? `${baseId}-pc` : undefined"
        :aria-label="isExpandable ? (isExpanded ? '詳細を閉じる' : '詳細を開く') : undefined"
        v-on="isExpandable ? { click: onRowActivate } : {}"
      >
        <div class="w-36 shrink-0 px-4 py-2.5 flex items-center gap-2">
          <span
            class="text-sm"
            :class="{ 'text-primary font-semibold': isToday }"
          >
            {{ formatMonthDay(date) }}（{{ dayLabel }}）
          </span>
          <span
            v-if="isToday"
            class="inline-block w-1.5 h-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
        </div>

        <div class="w-32 shrink-0 px-2 py-2.5 text-sm text-muted tabular-nums">
          <template v-if="report">
            {{ toHm(report.check_in) }} 〜 {{ toHm(report.check_out) }}
          </template>
          <template v-else>
            ——
          </template>
        </div>

        <div
          class="flex-1 min-w-0 px-2 py-2.5 text-sm overflow-hidden whitespace-nowrap text-ellipsis"
          :class="hasReport ? '' : 'text-dimmed'"
        >
          <template v-if="report">
            {{ report.content.slice(0, 80) }}{{ report.content.length > 80 ? '…' : '' }}
          </template>
          <template v-else>
            未入力
          </template>
        </div>

        <div class="w-28 shrink-0 px-2 py-2.5 flex justify-center">
          <MoodStars
            v-if="report?.mood"
            :model-value="report.mood"
            readonly
            size="sm"
          />
        </div>
      </component>

      <!-- 操作（ペン）はトグル button の外側 -->
      <div class="w-20 px-3 flex justify-end items-center">
        <UButton
          v-if="isTrainee"
          variant="ghost"
          size="sm"
          icon="i-lucide-pencil"
          :aria-label="hasReport ? '日報を編集' : '日報を入力'"
          @click="onPencil"
        />
        <UIcon
          v-else-if="isExpandable"
          name="i-lucide-chevron-down"
          class="size-5 text-dimmed transition-transform motion-reduce:transition-none"
          aria-hidden="true"
          :class="{ 'rotate-180': isExpanded }"
        />
      </div>
    </div>

    <!-- 詳細展開（PC） -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isExpanded && report"
        :id="`${baseId}-pc`"
        class="px-5 py-4 bg-primary/5 border-t border-default"
      >
        <div class="flex flex-wrap gap-4 mb-3 text-sm">
          <span class="text-muted tabular-nums">
            出勤 <strong class="text-highlighted">{{ toHm(report.check_in) }}</strong>
          </span>
          <span class="text-muted tabular-nums">
            退勤 <strong class="text-highlighted">{{ toHm(report.check_out) }}</strong>
          </span>
          <span
            v-if="report.mood"
            class="flex items-center gap-1 text-muted"
          >
            気分 <MoodStars
              :model-value="report.mood"
              readonly
              size="sm"
            />
          </span>
        </div>
        <p class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
          {{ report.content }}
        </p>
      </div>
    </Transition>
  </div>

  <!-- SP レイアウト -->
  <div class="sm:hidden border-b border-default">
    <div
      class="px-4 py-3 transition-colors motion-reduce:transition-none"
      :class="{ 'bg-elevated': isToday }"
    >
      <div class="grid grid-cols-[1fr_auto] items-start gap-2">
        <!-- コンテンツ領域がトグル（ペンは外側） -->
        <component
          :is="isExpandable ? 'button' : 'div'"
          :type="isExpandable ? 'button' : undefined"
          class="min-w-0 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          :class="{ 'cursor-pointer': isExpandable }"
          :aria-expanded="isExpandable ? isExpanded : undefined"
          :aria-controls="isExpandable ? `${baseId}-sp` : undefined"
          :aria-label="isExpandable ? (isExpanded ? '詳細を閉じる' : '詳細を開く') : undefined"
          v-on="isExpandable ? { click: onRowActivate } : {}"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="text-sm font-semibold whitespace-nowrap"
              :class="{ 'text-primary': isToday }"
            >
              {{ formatMonthDay(date) }}（{{ dayLabel }}）
            </span>
            <span
              v-if="report"
              class="text-xs text-muted whitespace-nowrap tabular-nums"
            >
              {{ toHm(report.check_in) }} 〜 {{ toHm(report.check_out) }}
            </span>
            <span
              v-else
              class="text-xs text-dimmed"
            >
              未入力
            </span>
          </div>
          <div
            v-if="report && !isExpanded"
            class="flex items-center gap-2 mt-1"
          >
            <p class="text-sm text-muted overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
              {{ report.content.slice(0, 60) }}{{ report.content.length > 60 ? '…' : '' }}
            </p>
            <MoodStars
              v-if="report.mood"
              :model-value="report.mood"
              readonly
              size="xs"
            />
          </div>
        </component>

        <!-- 操作（ペン）はトグル button の外側 -->
        <div class="shrink-0">
          <UButton
            v-if="isTrainee"
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            :aria-label="hasReport ? '日報を編集' : '日報を入力'"
            @click="onPencil"
          />
          <UIcon
            v-else-if="isExpandable"
            name="i-lucide-chevron-down"
            class="size-4 text-dimmed transition-transform motion-reduce:transition-none"
            aria-hidden="true"
            :class="{ 'rotate-180': isExpanded }"
          />
        </div>
      </div>
    </div>
    <!-- SP 詳細展開 -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isExpanded && report"
        :id="`${baseId}-sp`"
        class="px-4 py-3 bg-primary/5"
      >
        <p class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
          {{ report.content }}
        </p>
      </div>
    </Transition>
  </div>
</template>
