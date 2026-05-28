<script setup lang="ts">
/**
 * フォーム実装のサンプルコンポーネント
 *
 * このファイルはメンバーが写経・参考にするためのサンプルです。
 * UForm + zod + useToast の基本的な使い方を、実際の日報フォームを題材に示しています。
 *
 * 実際の日報入力モーダル（ReportInputModal.vue）などを実装する際は、
 * このパターンを参考にしてください。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
// ① Zod スキーマは app/types/schemas.ts に集約する規約。
//    コンポーネント内でinline定義せず、import して使う。
import { reportSchema, type ReportSchema } from '~/types/schemas'

// ② フォーム送信完了・キャンセルは emit で親（モーダルを開いた側）へ通知する
const emit = defineEmits<{ cancel: [], saved: [] }>()

// ③ フォームの状態を reactive で管理する（初期値は undefined）
const state = reactive<Partial<ReportSchema>>({
  date: undefined,
  check_in: undefined,
  check_out: undefined,
  content: undefined,
  mood: undefined
})

// mood（気分）は任意項目。USelect 用の選択肢
const MOOD_OPTIONS = [
  { label: '5（とても良い）', value: 5 },
  { label: '4', value: 4 },
  { label: '3（ふつう）', value: 3 },
  { label: '2', value: 2 },
  { label: '1（よくない）', value: 1 }
]

const toast = useToast()
// ④ エラーは useApiError composable に委譲する。as キャストを避け、
//    409 など特定 statusCode の専用メッセージは statusMessages で指定する。
const apiError = useApiError()
const loading = ref(false)

// ⑤ 送信時の処理（スキーマのバリデーションが通った後に呼ばれる）
//    event.data はバリデーション済みの値。$fetch は必ず try/catch で囲む。
const onSubmit = async (event: FormSubmitEvent<ReportSchema>): Promise<void> => {
  loading.value = true

  try {
    await $fetch('/api/reports', { method: 'POST', body: event.data })
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 409: '同じ日付の日報がすでに存在します' },
      fallback: '保存に失敗しました'
    })
    loading.value = false
    return
  }

  toast.add({ title: '保存しました', color: 'success' })

  // フォームをリセット
  state.date = undefined
  state.check_in = undefined
  state.check_out = undefined
  state.content = undefined
  state.mood = undefined

  loading.value = false

  // 親へ完了を通知（親はモーダルを閉じて一覧を再取得する想定）
  emit('saved')
}
</script>

<template>
  <!-- ⑤ UForm に schema と state を渡す。@submit でバリデーション通過後の処理を呼ぶ -->
  <UForm
    :schema="reportSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- ⑥ UFormField の name はスキーマのキーと一致させる（エラー表示が自動で紐づく） -->
    <UFormField
      name="date"
      label="日付"
      required
    >
      <UInput
        v-model="state.date"
        type="date"
      />
    </UFormField>

    <UFormField
      name="check_in"
      label="出勤時間"
      required
    >
      <UInput
        v-model="state.check_in"
        type="time"
      />
    </UFormField>

    <UFormField
      name="check_out"
      label="退勤時間"
      required
    >
      <UInput
        v-model="state.check_out"
        type="time"
      />
    </UFormField>

    <UFormField
      name="content"
      label="やったこと"
      required
    >
      <UTextarea
        v-model="state.content"
        placeholder="今日やったことを入力してください"
        :rows="5"
      />
    </UFormField>

    <!-- mood は任意項目なので required を付けない -->
    <UFormField
      name="mood"
      label="気分（任意）"
    >
      <USelect
        v-model="state.mood"
        :items="MOOD_OPTIONS"
        placeholder="選択してください"
      />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        color="neutral"
        variant="outline"
        type="button"
        @click="emit('cancel')"
      >
        キャンセル
      </UButton>
      <UButton
        type="submit"
        :loading="loading"
      >
        保存
      </UButton>
    </div>
  </UForm>
</template>
