<script setup lang="ts">
/**
 * ロール別のバッジ。
 * docs/design-spec.md のロールバッジカラー（trainee=Indigo / mentor=Green / ojt=Purple / admin=Gray）に対応する。
 * 色マッピングは utils/role.ts に集約し、変更時は1箇所で済む。
 */
import type { UserRole } from '#shared/types/api'

defineProps<{ role: UserRole }>()
</script>

<template>
  <span
    class="inline-block px-2 py-0.5 rounded text-xs font-medium leading-tight"
    :class="ROLE_BADGE_CLASSES[role]"
  >
    {{ ROLE_LABELS[role] }}
  </span>
</template>
