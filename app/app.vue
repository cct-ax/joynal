<script setup lang="ts">
// @nuxt/ui コンポーネント（UCalendar の曜日・月名や内蔵 aria 文言）の言語設定。
// 文書言語の <html lang="ja">（nuxt.config の htmlAttrs.lang）とは別管理で、
// v4 ではこの UApp :locale が唯一の指定方法。
import { ja } from '@nuxt/ui/locale'
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <UApp :locale="ja">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </div>
</template>
