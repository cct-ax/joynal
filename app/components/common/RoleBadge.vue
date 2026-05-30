<script setup lang="ts">
/**
 * ロール別のバッジ。
 * docs/design-spec.md のロールバッジカラー（trainee=Indigo / mentor=Green / ojt=Purple / admin=Gray）に対応する。
 *
 * 土台は @nuxt/ui の UBadge。ただしロール配色には @nuxt/ui のテーマ外の色（purple 等）が
 * 含まれるため、色は ROLE_BADGE_CLASSES（utils/role.ts に集約）で上書きする。
 * variant="soft" はリング無しのため、bg/text の上書きだけで素直に配色できる。
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
    :class="ROLE_BADGE_CLASSES[role]"
  />
</template>
