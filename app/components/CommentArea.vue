<script setup lang="ts">
/**
 * 週次コメント表示エリア。
 *
 * - PC は 2 カラム（メンター / OJT 横並び）、SP は 1 カラム縦積み。
 * - 自分のロールに一致するときだけ「入力/編集」ボタンを表示する。
 * - MS2 では表示中心。`editComment` emit は親（report.vue）でハンドリングし、
 *   MS3 で CommentInputModal を接続する想定。
 *
 * design プロト L840-882（CommentArea）を Vue 化したもの。
 */
import type { UserRole, CommentWithCommenter } from '#shared/types/api'

defineProps<{
  weekStart: Date
  mentorComment: CommentWithCommenter | null
  ojtComment: CommentWithCommenter | null
  role: UserRole
}>()

const emit = defineEmits<{
  editComment: [target: 'mentor' | 'ojt']
}>()
</script>

<template>
  <div class="border-t-2 border-gray-200 dark:border-gray-800 px-5 py-5">
    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
      週次コメント
    </h4>
    <div class="grid sm:grid-cols-2 grid-cols-1 gap-4">
      <!-- メンターコメント -->
      <div class="bg-gray-100 dark:bg-gray-800/50 rounded p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <RoleBadge role="mentor" />
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ mentorComment?.commenter.name ?? '担当未割当' }}
            </span>
          </div>
          <UButton
            v-if="role === 'mentor'"
            variant="ghost"
            size="xs"
            @click="emit('editComment', 'mentor')"
          >
            {{ mentorComment ? '編集' : '入力' }}
          </UButton>
        </div>
        <p
          class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
          :class="mentorComment ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'"
        >
          {{ mentorComment?.content ?? 'コメントはまだありません' }}
        </p>
      </div>

      <!-- OJT コメント -->
      <div class="bg-gray-100 dark:bg-gray-800/50 rounded p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <RoleBadge role="ojt" />
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ ojtComment?.commenter.name ?? '担当未割当' }}
            </span>
          </div>
          <UButton
            v-if="role === 'ojt'"
            variant="ghost"
            size="xs"
            @click="emit('editComment', 'ojt')"
          >
            {{ ojtComment ? '編集' : '入力' }}
          </UButton>
        </div>
        <p
          class="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
          :class="ojtComment ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'"
        >
          {{ ojtComment?.content ?? 'コメントはまだありません' }}
        </p>
      </div>
    </div>
    <!-- TODO MS3: editComment emit を CommentInputModal と接続する -->
  </div>
</template>
