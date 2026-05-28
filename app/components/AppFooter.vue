<script setup lang="ts">
/**
 * 全ページ共通のフッター。
 *
 * - 左: アプリの補足テキスト
 * - 右: コピーライト（年は実行時に取得して動的表示）
 * - 配置・コンテナは UFooter 既定に委譲し、幅のみヘッダー/メインと揃える。
 *
 * design プロトにフッターは無いが、レイアウト下端の情報表示として最小構成で新設。
 */
const year = new Date().getFullYear()
</script>

<template>
  <UFooter :ui="{ container: 'max-w-5xl' }">
    <template #left>
      <p class="text-sm text-muted">
        新人研修日報管理
      </p>
    </template>

    <template #right>
      <p class="text-sm text-muted tabular-nums">
        © {{ year }} Joynal
      </p>
    </template>
  </UFooter>
</template>
