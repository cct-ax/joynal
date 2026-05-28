<script setup lang="ts">
/**
 * 認証系画面（login / reset-password）の共通レイアウト。
 *
 * - 画面中央に Joynal ブランド名（任意）+ UCard を配置。
 * - title / subtitle プロップで上部のブランド表示を切り替え（省略時は非表示）。
 * - UCard 内のスロット:
 *     - #header — UCard 内のタイトル領域（reset 画面の「パスワードリセット」見出しに使う）
 *     - default — フォーム本体
 *     - #footer — リンク等
 *
 * design プロト L462-484（LoginScreen）・L492-513（ResetScreen）を Vue 化したもの。
 */
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
  }>(),
  { title: '', subtitle: '' }
)
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 gap-6">
    <div
      v-if="title"
      class="text-center"
    >
      <h1 class="text-3xl font-bold tracking-tight">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="mt-1 text-sm text-gray-500 dark:text-gray-400"
      >
        {{ subtitle }}
      </p>
    </div>

    <UCard class="w-full max-w-sm">
      <template
        v-if="$slots.header"
        #header
      >
        <slot name="header" />
      </template>
      <slot />
      <template
        v-if="$slots.footer"
        #footer
      >
        <slot name="footer" />
      </template>
    </UCard>
  </div>
</template>
