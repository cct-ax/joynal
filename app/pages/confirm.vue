<script setup lang="ts">
/** メール認証リンク経由のトークン交換ページ。@nuxtjs/supabase が自動処理し、完了後 /report へリダイレクトする。 */
// @nuxtjs/supabase がトークン交換を自動処理する
// 処理完了後に /report へリダイレクト
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
    <UIcon
      name="i-lucide-loader-circle"
      class="size-8 animate-spin text-indigo-600 motion-reduce:animate-none"
    />
    <p
      role="status"
      class="text-sm text-gray-500 dark:text-gray-400"
    >
      認証中…
    </p>
  </div>
</template>
