<script setup lang="ts">
/**
 * 空状態プレースホルダ。
 *
 * - icon（lucide アイコン名 `i-lucide-*`）でアイコンを表示。
 * - メッセージ下に slot で操作 UI（ボタン等）を差し込める。
 * - design プロト L979-991（管理者の新人未選択時）相当。
 */
defineProps<{
  /** 表示する Iconify アイコン名（例: `i-lucide-clipboard-list`） */
  icon?: string
  /** 空状態の説明テキスト */
  message: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center gap-4 py-10 px-6">
    <UIcon
      v-if="icon"
      :name="icon"
      class="w-12 h-12 opacity-40 text-dimmed"
    />
    <p class="text-sm text-muted">
      {{ message }}
    </p>
    <slot />
  </div>
</template>
