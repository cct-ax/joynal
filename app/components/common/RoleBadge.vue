<script setup lang="ts">
/**
 * ロール別のバッジ。
 * docs/design-spec.md のロールバッジカラー（trainee=Indigo / mentor=Green / ojt=Purple / admin=Gray）に対応する。
 *
 * 土台は @nuxt/ui の UBadge。ただしロール配色には @nuxt/ui のテーマ外の色（purple 等）が
 * 含まれるため、色は ROLE_BADGE_CLASSES（utils/role.ts に集約）で上書きする。
 * variant="soft" はリング無しのため、bg/text の上書きだけで素直に配色できる。
 *
 * ラベルは文字数がロールごとに異なる（新人=2 / メンター=4 / OJT=3 / 管理者=3）ため、
 * 最長ラベル基準の固定 min-width（min-w-18）＋ justify-center で全ロールの幅を揃える。
 */
import type { UserRole } from '#shared/types/api'

defineProps<{ role: UserRole }>()
</script>

<template>
  <UBadge
    :label="ROLE_LABELS[role]"
    color="neutral"
    variant="soft"
    size="md"
    :class="[ROLE_BADGE_CLASSES[role], 'min-w-18 justify-center']"
  />
</template>
