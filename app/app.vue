<script setup lang="ts">
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
