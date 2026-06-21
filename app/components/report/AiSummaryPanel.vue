<script setup lang="ts">
/**
 * AI 週次サマリーの表示パネル（表示専用）。
 *
 * 生成/再生成ボタン・鮮度バッジ・「参考情報」注記を持つ。
 * サマリーは評価でなく参考情報。生成有無・取得・鮮度判定は呼び出し元が行う。
 */
import type { WeeklySummaryData } from '#shared/types/api'

defineProps<{
  summary: WeeklySummaryData | null
  stale: boolean
  generating: boolean
}>()

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

    <template v-if="summary">
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
