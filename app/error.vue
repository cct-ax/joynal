<script setup lang="ts">
import type { NuxtError } from '#app'
import { ja } from '@nuxt/ui/locale'

const props = defineProps<{ error: NuxtError }>()

// 内部メッセージ（error.message）は漏洩防止のため UError に渡さず、
// ステータスに応じた日本語タイトルのみを statusMessage として表示する。
const title = computed(() =>
  props.error.statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました'
)
</script>

<template>
  <!-- error.vue は app.vue の <UApp> 外で描画されるため、ここで再度ラップする。 -->
  <UApp :locale="ja">
    <UError
      :error="{ statusCode: error.statusCode, statusMessage: title }"
      :clear="{ label: 'トップへ戻る', icon: 'i-lucide-house' }"
    />
  </UApp>
</template>
