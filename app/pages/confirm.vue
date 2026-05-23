<script setup lang="ts">
// @nuxtjs/supabase がトークン交換を自動処理する
// 処理完了後に /report へリダイレクト
definePageMeta({ layout: false })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#f9fafb] px-5 py-8">
    <UCard
      class="w-full max-w-sm"
      :ui="{
        root: 'rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
        body: 'p-7'
      }"
    >
      <div class="flex flex-col items-center text-center">
        <UIcon
          name="i-lucide-loader-circle"
          class="mb-4 size-8 animate-spin text-[#4f46e5]"
        />
        <h1 class="text-lg font-semibold text-[#111827]">
          認証中...
        </h1>
        <p class="mt-2 text-sm text-[#6b7280]">
          画面が切り替わるまでしばらくお待ちください。
        </p>
      </div>
    </UCard>
  </div>
</template>
