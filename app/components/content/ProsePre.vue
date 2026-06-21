<script setup lang="ts">
/**
 * MDC の `<ProsePre>`（フェンスコードブロック）を上書きする（docs サイト・dev 限定）。
 *
 * language が `mermaid` のときは図として描画し、それ以外は通常のコードブロック
 * （Shiki ハイライト済みの slot）をそのまま表示する。これにより docs/*.md の
 * ```mermaid を**無改変**のまま GitHub ではネイティブ描画・サイトでは図描画にできる。
 * 本ファイルは nuxt.config の ignore で本番ビルドから除外する。
 */
import { computed } from 'vue'

const props = defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: number[]
  meta?: string | null
  class?: string | null
  // MDC は style を文字列でもオブジェクトでも渡すため両方受ける。
  style?: string | Record<string, unknown> | null
}>()

const isMermaid = computed(() => props.language === 'mermaid')
</script>

<template>
  <Mermaid
    v-if="isMermaid"
    :code="code ?? ''"
  />
  <pre
    v-else
    :class="props.class"
    :style="props.style"
  ><slot /></pre>
</template>
