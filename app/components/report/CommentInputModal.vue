<script setup lang="ts">
/**
 * 週次コメント入力・編集モーダル（mentor / ojt ロール）。
 *
 * - `existing` が null なら新規入力、null 以外なら編集モード。
 * - 週次コメントは週（weekStart）× 対象新人（traineeId）単位の upsert。
 * - commenter（コメント主）はサーバー側で JWT から決まるため送信しない。
 *   targetRole は呼び出し側の意図を表す props で、本文には影響しない。
 * - スマホでは全画面モーダル化（ReportInputModal と同じ `:ui`）。
 *
 * design プロト（週次コメント入力）を Vue 化したもの。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CommentWithCommenter } from '#shared/types/api'
import { commentSchema, type CommentSchema } from '#shared/types/schemas'

const open = defineModel<boolean>('open')

const props = defineProps<{
  weekStart: Date
  traineeId: string
  targetRole: 'mentor' | 'ojt'
  existing: CommentWithCommenter | null
}>()

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const apiError = useApiError()
const loading = ref(false)

const isEdit = computed(() => props.existing !== null)
const title = computed(() => (isEdit.value ? '週次コメントを編集' : '週次コメントを入力'))
const weekLabel = computed(() => formatWeekLabel(props.weekStart))

const state = reactive<Partial<CommentSchema>>({ content: undefined })

// モーダルの開閉に追従して state を初期化する。
// 開く時は既存コメント本文を反映し、閉じる時は空に戻す（次回は空から始める）。
// immediate: true で初回マウント時（open=true 付き）にも反映させる。
watch(
  open,
  (opened) => {
    state.content = opened ? (props.existing?.content ?? undefined) : undefined
  },
  { immediate: true }
)

const close = (): void => {
  open.value = false
}

// 送信処理本体。UForm @submit から呼ぶほか、テストでは defineExpose 経由で直接呼ぶ。
const submit = async (data: CommentSchema): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/comments', {
      method: 'PUT',
      body: {
        weekStart: formatYmd(props.weekStart),
        traineeId: props.traineeId,
        content: data.content
      }
    })
    toast.add({ title: 'コメントを保存しました', color: 'success' })
    emit('saved')
    open.value = false
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 403: 'アクセス権限がありません' },
      fallback: 'コメントの保存に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<CommentSchema>): Promise<void> => submit(event.data)

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{
      content: 'max-sm:w-screen! max-sm:h-dvh! max-sm:max-w-none! max-sm:rounded-none! sm:max-w-lg'
    }"
  >
    <template #body>
      <UForm
        :schema="commentSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="flex items-center gap-2 px-3 py-2 bg-elevated rounded-sm">
          <span class="text-sm font-semibold">{{ weekLabel }}</span>
        </div>

        <UFormField
          name="content"
          label="コメント"
          required
        >
          <UTextarea
            v-model="state.content"
            :rows="8"
            autoresize
            placeholder="今週の業務を通じて感じたことや、来週に向けてのコメントを記入してください"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="loading"
            @click="close"
          >
            キャンセル
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            {{ isEdit ? '更新' : '保存' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
