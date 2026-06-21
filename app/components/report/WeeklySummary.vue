<script setup lang="ts">
/**
 * 週次サマリーエリア。
 *
 * - showChart=true（mentor/ojt/admin）: 選択中新人の mood 推移グラフ＋AI 週次サマリー（観察視点）
 * - showChart=false（新人本人）: AI 週次サマリー（自分の振り返り）のみ（mood グラフは出さない）
 * 表示判定・データ取得は呼び出し元（report.vue）が行い、本コンポーネントは描画に徹する。
 */
import type { WeeklySummaryData } from '#shared/types/api'
import type { MoodChartPoint } from '../../utils/moodChart'

withDefaults(defineProps<{
  showChart?: boolean
  series?: MoodChartPoint[]
  hasData?: boolean
  loading?: boolean
  summary?: WeeklySummaryData | null
  summaryStale?: boolean
  summaryGenerating?: boolean
  summaryStreamingContent?: string
}>(), {
  showChart: true,
  series: () => [],
  hasData: false,
  loading: false,
  summary: null,
  summaryStale: false,
  summaryGenerating: false,
  summaryStreamingContent: ''
})

const emit = defineEmits<{ generate: [] }>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <template #header>
      <h2 class="text-sm font-semibold text-highlighted">
        週次サマリー
      </h2>
    </template>

    <div class="space-y-6">
      <section
        v-if="showChart"
        aria-label="気分の推移"
      >
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

      <AiSummaryPanel
        :summary="summary"
        :stale="summaryStale"
        :generating="summaryGenerating"
        :streaming-content="summaryStreamingContent"
        @generate="emit('generate')"
      />
    </div>
  </UCard>
</template>
