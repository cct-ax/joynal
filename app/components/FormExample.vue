<script setup lang="ts">
/**
 * フォーム実装のサンプルコンポーネント
 *
 * このファイルはメンバーが写経・参考にするためのサンプルです。
 * UForm + zod + useToast の基本的な使い方を示しています。
 *
 * 実際の日報フォームを実装する際は、このパターンを参考にしてください。
 */
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// ① zod でバリデーションルールを定義する
const schema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  content: z.string().min(1, '内容は必須です').max(500, '500文字以内で入力してください'),
  date: z.string().min(1, '日付は必須です')
})

// ② スキーマから TypeScript の型を作る
type Schema = z.output<typeof schema>

// ③ フォームの状態を reactive で管理する
const emit = defineEmits<{ cancel: [] }>()

const state = reactive<Partial<Schema>>({
  title: undefined,
  content: undefined,
  date: undefined
})

const toast = useToast()
const loading = ref(false)

// ④ 送信時の処理（バリデーションが通った後に呼ばれる）
const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  loading.value = true

  // ここで Supabase にデータを保存する
  // 例:
  // const { error } = await supabase.from('daily_reports').insert({ ... })
  // if (error) { toast.add({ title: 'エラーが発生しました', color: 'error' }); return }

  // 成功時のフィードバック
  toast.add({ title: '保存しました', color: 'success' })

  // フォームをリセット
  state.title = undefined
  state.content = undefined
  state.date = undefined

  loading.value = false

  // event.data に型付きのフォーム値が入っている
  console.log(event.data)
}
</script>

<template>
  <!-- ⑤ UForm に schema と state を渡す。@submit でバリデーション通過後の処理を呼ぶ -->
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- ⑥ UFormField の name はスキーマのキーと一致させる（エラー表示が自動で紐づく） -->
    <UFormField
      name="title"
      label="タイトル"
      required
    >
      <UInput
        v-model="state.title"
        placeholder="タイトルを入力"
      />
    </UFormField>

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
      name="content"
      label="内容"
      required
    >
      <UTextarea
        v-model="state.content"
        placeholder="内容を入力してください"
        :rows="5"
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
