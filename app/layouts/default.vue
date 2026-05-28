<script setup lang="ts">
/**
 * 全ページ共通レイアウト。
 * ヘッダーは AppHeader コンポーネントに切り出してある（ユーザーメニューも含む）。
 */
</script>

<template>
  <div>
    <AppHeader />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
