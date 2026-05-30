<script setup lang="ts">
/**
 * 日報リスト 1 行分のコンポーネント。
 *
 * - 新人ロール: 未入力ならペンアイコンで入力モーダル起動、入力済みなら編集モーダル起動。
 * - 他ロール（mentor/ojt/admin）: 入力済みのみ行全体が開示トグル（disclosure）になり、
 *   クリック/Enter/Space で詳細を展開する。
 * - PC/SP は CSS-only で切替（`max-sm:`/`sm:`）。JS の isMobile 判定は使わない。
 *
 * a11y: 展開可能な行は `<button aria-expanded aria-controls>` として描画し（`<component :is>`）、
 * 展開不可の行は非インタラクティブな `<div>`（click ハンドラを束ねない）にする。これにより
 * `<div @click>` のキーボード非対応アンチパターンを避ける。装飾的な chevron は `aria-hidden`。
 * 詳細パネルの開閉は `<Transition>` で transform/opacity のみアニメーションし、
 * `prefers-reduced-motion` を尊重する。配色は @nuxt/ui の semantic トークン（today は primary）。
 *
 * design プロト L754-836（DayRow）を Vue 化したもの。土日は親側で渡さない設計のため
 * このコンポーネントで weekend filter はしない。
 */
import type { UserRole } from '#shared/types/api'
import type { DailyReport } from '#shared/types/models'

const props = defineProps<{
  date: Date
  report: DailyReport | null
  role: UserRole
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  inputReport: [date: Date]
  editReport: [report: DailyReport]
  toggleDetail: [date: Date]
}>()

const hasReport = computed(() => props.report !== null)
const isTrainee = computed(() => props.role === 'trainee')
// 他ロール・入力済みの行のみ「開示トグル」になる
const isExpandable = computed(() => hasReport.value && !isTrainee.value)
const isToday = computed(() => formatYmd(props.date) === formatYmd(new Date()))

// 詳細パネルと aria-controls を結ぶ ID（PC/SP で重複しないよう接尾辞を付ける）
const baseId = useId()

// DAY_LABELS は月〜金。月曜=0 なので getDay() を月曜起点にシフト
const dayLabel = computed(() => {
  const idx = (props.date.getDay() + 6) % 7
  return DAY_LABELS[idx] ?? ''
})

// 行全体のトグル。展開可能な行にのみ click を束ねる（下の v-on を参照）
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
    <component
      :is="isExpandable ? 'button' : 'div'"
      :type="isExpandable ? 'button' : undefined"
      class="flex items-center min-h-12 w-full text-left transition-colors motion-reduce:transition-none"
      :class="{
        'bg-elevated': isToday,
        'cursor-pointer hover:bg-elevated': isExpandable
      }"
      :aria-expanded="isExpandable ? isExpanded : undefined"
      :aria-controls="isExpandable ? `${baseId}-pc` : undefined"
      :aria-label="isExpandable ? (isExpanded ? '詳細を閉じる' : '詳細を開く') : undefined"
      v-on="isExpandable ? { click: onRowActivate } : {}"
    >
      <div class="w-32 shrink-0 px-4 py-2.5 flex items-center gap-2">
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

      <div class="w-36 shrink-0 px-2 py-2.5 text-sm text-muted tabular-nums">
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

      <div class="w-20 shrink-0 px-2 py-2.5 flex justify-center">
        <MoodStars
          v-if="report?.mood"
          :model-value="report.mood"
          readonly
          size="sm"
        />
      </div>

      <div class="w-24 shrink-0 px-3 py-2.5 flex justify-end">
        <UButton
          v-if="isTrainee"
          variant="ghost"
          size="sm"
          icon="i-lucide-pencil"
          :aria-label="hasReport ? '日報を編集' : '日報を入力'"
          @click.stop="onPencil"
        />
        <UIcon
          v-else-if="isExpandable"
          name="i-lucide-chevron-down"
          class="size-5 text-dimmed transition-transform motion-reduce:transition-none"
          aria-hidden="true"
          :class="{ 'rotate-180': isExpanded }"
        />
      </div>
    </component>

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
    <component
      :is="isExpandable ? 'button' : 'div'"
      :type="isExpandable ? 'button' : undefined"
      class="w-full text-left px-4 py-3 transition-colors motion-reduce:transition-none"
      :class="{
        'bg-elevated': isToday,
        'cursor-pointer': isExpandable
      }"
      :aria-expanded="isExpandable ? isExpanded : undefined"
      :aria-controls="isExpandable ? `${baseId}-sp` : undefined"
      :aria-label="isExpandable ? (isExpanded ? '詳細を閉じる' : '詳細を開く') : undefined"
      v-on="isExpandable ? { click: onRowActivate } : {}"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
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
        <div class="shrink-0">
          <UButton
            v-if="isTrainee"
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            :aria-label="hasReport ? '日報を編集' : '日報を入力'"
            @click.stop="onPencil"
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
