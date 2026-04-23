<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number, message: string } }>()

const title = computed(() => {
  if (props.error.statusCode === 404) return 'ページが見つかりません'
  return 'エラーが発生しました'
})

const goHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div>
    <h1>{{ error.statusCode }}</h1>
    <p>{{ title }}</p>
    <button @click="goHome">
      トップへ戻る
    </button>
  </div>
</template>
