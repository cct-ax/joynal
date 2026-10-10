<script setup lang="ts">
/**
 * Mermaid 図をクライアント側で描画する（docs サイト・dev 限定）。
 * code は docs/*.md の ```mermaid フェンス本文（自前コンテンツ＝信頼済み）。
 * mermaid は重いので動的 import＋ClientOnly でクライアントのみロードする。
 * 本ファイルは nuxt.config の ignore で本番ビルドから除外する。
 */
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{ code: string }>()

const svg = ref('')
const error = ref('')

const colorMode = useColorMode()

const render = async (): Promise<void> => {
  if (!props.code.trim()) return
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: colorMode.value === 'dark' ? 'dark' : 'default'
    })
    const id = `mmd-${Math.random().toString(36).slice(2)}`
    const { svg: out } = await mermaid.render(id, props.code)
    svg.value = out
    error.value = ''
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Mermaid の描画に失敗しました'
    svg.value = ''
  }
}

onMounted(render)
watch([() => props.code, () => colorMode.value], render)
</script>

<template>
  <ClientOnly>
    <div
      v-if="error"
      class="my-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
    >
      <p class="font-medium">
        Mermaid 図を描画できませんでした
      </p>
      <pre class="mt-1 whitespace-pre-wrap text-xs opacity-80">{{ error }}</pre>
    </div>
    <!-- eslint-disable vue/no-v-html -- mermaid の出力は securityLevel:'strict' でサニタイズ済み・自前コンテンツ由来 -->
    <div
      v-else
      class="my-4 flex justify-center overflow-x-auto"
      v-html="svg"
    />
    <!-- eslint-enable vue/no-v-html -->
    <template #fallback>
      <div class="my-4 rounded-lg border border-default bg-elevated/40 p-4 text-sm text-muted">
        図を描画中…
      </div>
    </template>
  </ClientOnly>
</template>
