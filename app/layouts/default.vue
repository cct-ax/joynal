<script setup lang="ts">
/**
 * 全ページ共通レイアウト。
 * ヘッダーは AppHeader、フッターは AppFooter に切り出してある。
 * UMain（残り高を埋める）で挟み、フッターを常に画面下端へ固定する（sticky footer）。
 */
</script>

<template>
  <div class="flex flex-col min-h-dvh">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500"
    >
      本文へスキップ
    </a>
    <AppHeader />
    <UMain
      id="main"
      tabindex="-1"
      class="scroll-mt-16 focus:outline-none"
      :ui="{ base: 'flex-1 min-h-0' }"
    >
      <div class="max-w-5xl mx-auto px-4 py-6">
        <slot />
      </div>
    </UMain>
    <AppFooter />
  </div>
</template>
