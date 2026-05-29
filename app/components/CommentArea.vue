<script setup lang="ts">
/**
 * 週次コメント表示エリア。
 *
 * - PC は 2 カラム（メンター / OJT 横並び）、SP は 1 カラム縦積み。
 * - メンター / OJT は DOM が同一なので sections 配列を v-for で描画する。
 * - 自分のロールに一致するときだけ「入力/編集」ボタンを表示する。
 * - 配色は @nuxt/ui の semantic トークン（text-muted / text-default / text-dimmed /
 *   bg-elevated）に統一。区切りは USeparator、コメント箱は UCard を使う。
 * - MS2 では表示中心。`editComment` emit は親（report.vue）でハンドリングし、
 *   MS3 で CommentInputModal を接続する想定。
 *
 * design プロト L840-882（CommentArea）を Vue 化したもの。
 */
import type { UserRole, CommentWithCommenter } from '#shared/types/api'

// 週次コメントを書けるのは mentor / OJT のみ（UserRole の部分集合）
type CommentRole = Extract<UserRole, 'mentor' | 'ojt'>

const props = defineProps<{
  weekStart: Date
  mentorComment: CommentWithCommenter | null
  ojtComment: CommentWithCommenter | null
  role: UserRole
}>()

const emit = defineEmits<{
  editComment: [target: CommentRole]
}>()

// メンター / OJT は構造が同一なので 1 つのループにまとめる
const sections = computed((): { role: CommentRole, comment: CommentWithCommenter | null }[] => [
  { role: 'mentor', comment: props.mentorComment },
  { role: 'ojt', comment: props.ojtComment }
])
</script>

<template>
  <div>
    <USeparator />
    <div class="px-5 py-5">
      <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
        週次コメント
      </h4>
      <div class="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <UCard
          v-for="section in sections"
          :key="section.role"
          variant="soft"
          :ui="{ body: 'p-4' }"
          class="rounded-md"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <RoleBadge :role="section.role" />
              <span class="text-xs text-muted">
                {{ section.comment?.commenter.name ?? '担当未割当' }}
              </span>
            </div>
            <UButton
              v-if="role === section.role"
              variant="ghost"
              size="xs"
              @click="emit('editComment', section.role)"
            >
              {{ section.comment ? '編集' : '入力' }}
            </UButton>
          </div>
          <p
            class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
            :class="section.comment ? 'text-default' : 'text-dimmed italic'"
          >
            {{ section.comment?.content ?? 'コメントはまだありません' }}
          </p>
        </UCard>
      </div>
      <!-- TODO MS3: editComment emit を CommentInputModal と接続する -->
    </div>
  </div>
</template>
