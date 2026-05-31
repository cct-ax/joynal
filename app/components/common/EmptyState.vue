<script setup lang="ts">
/**
 * 空状態プレースホルダ。
 *
 * - emoji（絵文字1〜2文字）または icon（iconify アイコン名）のどちらかを指定。
 * - メッセージ下に slot で操作 UI（ボタン等）を差し込める。
 * - design プロト L979-991（管理者の新人未選択時 📋）相当。
 */
import { Icon } from '@iconify/vue'

defineProps<{
  /** 表示する絵文字（icon と排他） */
  emoji?: string
  /** Iconify アイコン名（emoji と排他） */
  icon?: string
  /** 空状態の説明テキスト */
  message: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center gap-4 py-10 px-6">
    <div
      v-if="emoji"
      class="text-5xl opacity-40 select-none"
      role="presentation"
    >
      {{ emoji }}
    </div>
    <Icon
      v-else-if="icon"
      :icon="icon"
      class="w-12 h-12 opacity-40 text-dimmed"
    />
    <p class="text-sm text-muted">
      {{ message }}
    </p>
    <slot />
  </div>
</template>
