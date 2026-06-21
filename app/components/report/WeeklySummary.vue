<script setup lang="ts">
/**
 * 週次サマリーエリア（mentor/ojt/admin 向け）。
 *
 * - スライス1: 選択中新人の mood 推移グラフ（直近8週）を表示する。
 * - スライス2: ここに AI 週次サマリー（メンター版）を追加する予定（器を先に用意）。
 * - 表示判定（ロール・新人選択）は呼び出し元（report.vue）が行い、本コンポーネントは
 *   渡された series / hasData / loading の描画に徹する。
 */
import type { MoodChartPoint } from '../../utils/moodChart'

defineProps<{
  series: MoodChartPoint[]
  hasData: boolean
  loading?: boolean
}>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <template #header>
      <h2 class="text-sm font-semibold text-highlighted">
        週次サマリー
      </h2>
    </template>

    <section aria-label="気分の推移">
      <h3 class="text-xs font-medium text-muted mb-2">
        気分の推移（直近8週）
      </h3>

      <USkeleton
        v-if="loading"
        class="h-[220px] w-full"
      />

      <EmptyState
        v-else-if="!hasData"
        icon="i-lucide-line-chart"
        message="この期間に記録された気分がありません"
      />

      <MoodTrendChart
        v-else
        :series="series"
      />
    </section>
  </UCard>
</template>
