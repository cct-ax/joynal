<script setup lang="ts">
// @nuxtjs/supabase がトークン交換を自動処理する
// 処理完了後に /report へリダイレクト
definePageMeta({ layout: false })
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-muted px-5 py-8 text-default">
    <UColorModeButton
      color="neutral"
      variant="outline"
      size="sm"
      square
      class="fixed end-4 top-4 z-10 cursor-pointer"
    />

    <UCard
      class="w-full max-w-sm shadow-sm"
      :ui="{
        body: 'p-7'
      }"
    >
      <div class="flex flex-col items-center text-center">
        <UIcon
          name="i-lucide-loader-circle"
          class="mb-4 size-8 animate-spin text-primary"
        />
        <h1 class="text-lg font-semibold text-highlighted">
          認証中...
        </h1>
        <p class="mt-2 text-sm text-muted">
          画面が切り替わるまでしばらくお待ちください。
        </p>
      </div>
    </UCard>
  </div>
</template>
