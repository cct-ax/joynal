<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const title = computed(() => {
  if (props.error.statusCode === 404) return 'ページが見つかりません'
  return 'エラーが発生しました'
})

// clearError でエラー状態を解除し、トップへ遷移する
const goHome = (): void => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950 px-4 text-center">
    <p class="text-6xl font-bold text-gray-300 dark:text-gray-700 tabular-nums">
      {{ error.statusCode }}
    </p>
    <h1 class="text-xl font-bold tracking-tight">
      {{ title }}
    </h1>
    <UButton
      icon="i-lucide-house"
      @click="goHome"
    >
      トップへ戻る
    </UButton>
  </div>
</template>
