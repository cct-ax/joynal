<script setup lang="ts">
/**
 * AI 週次サマリーの表示パネル（表示専用）。
 *
 * 生成/再生成ボタン・鮮度バッジ・「参考情報」注記を持つ。
 * サマリーは評価でなく参考情報。生成有無・取得・鮮度判定は呼び出し元が行う。
 */
import type { WeeklySummaryData } from '#shared/types/api'

withDefaults(defineProps<{
  summary: WeeklySummaryData | null
  stale: boolean
  generating: boolean
  /** 生成中に逐次積まれる本文（SSE delta の連結）。 */
  streamingContent?: string
}>(), {
  streamingContent: ''
})

const emit = defineEmits<{ generate: [] }>()
</script>

<template>
  <section aria-label="AI 週次サマリー">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-medium text-muted">
        AI 週次サマリー（参考情報）
      </h3>
      <UButton
        size="xs"
        variant="ghost"
        color="primary"
        icon="i-lucide-sparkles"
        :loading="generating"
        @click="emit('generate')"
      >
        {{ summary ? '再生成' : '生成' }}
      </UButton>
    </div>

    <!-- 生成中: SSE で届く差分を逐次表示（タイプライタ的に伸びる） -->
    <p
      v-if="generating && streamingContent"
      class="text-sm text-highlighted whitespace-pre-wrap"
    >
      {{ streamingContent }}<span
        aria-hidden="true"
        class="ml-0.5 animate-pulse text-muted"
      >▌</span>
    </p>
    <template v-else-if="summary">
      <UAlert
        v-if="stale"
        color="warning"
        variant="soft"
        icon="i-lucide-clock"
        title="内容が更新されています"
        description="この週の日報が更新されました。再生成すると最新の内容で要約します。"
        class="mb-2"
      />
      <p class="text-sm text-highlighted whitespace-pre-wrap">
        {{ summary.content }}
      </p>
    </template>
    <p
      v-else
      class="text-sm text-muted"
    >
      まだサマリーがありません。「生成」で AI が振り返りを作成します（参考情報）。
    </p>
  </section>
</template>
