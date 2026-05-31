<script setup lang="ts">
/**
 * ReportRow の詳細展開パネル（PC/SP 共通）。
 *
 * - 開閉は `<Transition>` で transform/opacity のみアニメーションし、`prefers-reduced-motion`
 *   を尊重する（motion-reduce で transition なし）。PC/SP で同じトランジション定義を共有する。
 * - variant='pc' は出勤/退勤/気分のメタ行＋本文、variant='sp' は本文のみ。
 * - aria-controls の id は親の `<button>` と結ぶため panelId を受け取り `:id` に流す。
 *
 * 元 ReportRow.vue の PC/SP 詳細パネルを切り出したもの（class・構造・MoodStars の props は据え置き）。
 */
import type { DailyReport } from '#shared/types/models'

defineProps<{
  /** この日の日報（詳細表示対象、non-null） */
  report: DailyReport
  /** PC（メタ行あり）か SP（本文のみ）かのレイアウト切替 */
  variant: 'pc' | 'sp'
  /** aria-controls と結ぶ詳細パネルの id */
  panelId: string
  /** 詳細を展開表示するかどうか */
  isOpen: boolean
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
    enter-from-class="opacity-0 -translate-y-1"
    leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <!-- PC: メタ行（出勤/退勤/気分）＋本文 -->
    <div
      v-if="isOpen && variant === 'pc'"
      :id="panelId"
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

    <!-- SP: 本文のみ -->
    <div
      v-else-if="isOpen"
      :id="panelId"
      class="px-4 py-3 bg-primary/5"
    >
      <p class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
        {{ report.content }}
      </p>
    </div>
  </Transition>
</template>
