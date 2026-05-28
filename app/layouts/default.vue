<script setup lang="ts">
/**
 * 全ページ共通レイアウト。
 * ヘッダーは AppHeader コンポーネントに切り出してある（ユーザーメニューも含む）。
 */
</script>

<template>
  <div>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500"
    >
      本文へスキップ
    </a>
    <AppHeader />
    <main
      id="main"
      tabindex="-1"
      class="max-w-5xl mx-auto px-4 py-6 scroll-mt-16 focus:outline-none"
    >
      <slot />
    </main>
  </div>
</template>
