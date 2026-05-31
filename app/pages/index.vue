<script setup lang="ts">
/** ルートページ。middleware で /report へ即時リダイレクトする。 */
definePageMeta({
  middleware: () => navigateTo('/report', { replace: true })
})
</script>

<template>
  <div />
</template>
