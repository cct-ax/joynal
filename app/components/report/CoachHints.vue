<script setup lang="ts">
/**
 * AI コーチングのヒント表示（新人向け・表示専用）。
 *
 * 振り返りの深掘り質問と短い励ましを示す。
 * 本文への「挿入 / コピー」導線は意図的に持たない（代筆防止の一翼）。
 */
import type { AiCoachResponse } from '#shared/types/api'

defineProps<{
  hints: AiCoachResponse
}>()
</script>

<template>
  <div class="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
    <p class="flex items-center gap-1.5 text-xs font-semibold text-primary">
      <UIcon
        name="i-lucide-sparkles"
        class="size-3.5"
      />
      振り返りのヒント（AI・参考情報）
    </p>
    <ul class="space-y-1.5">
      <li
        v-for="(q, i) in hints.questions"
        :key="i"
        class="flex gap-2 text-sm text-highlighted"
      >
        <span class="text-primary font-medium">{{ i + 1 }}.</span>
        <span>{{ q }}</span>
      </li>
    </ul>
    <p
      v-if="hints.feedback"
      class="text-sm text-muted"
    >
      {{ hints.feedback }}
    </p>
  </div>
</template>
