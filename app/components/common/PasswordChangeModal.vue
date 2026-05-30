<script setup lang="ts">
/**
 * パスワード変更モーダル。
 *
 * - 現在のパスワード / 新しい / 確認用 の3フィールド。
 * - 確認用の一致は passwordChangeSchema の refine で検証する。
 * - Supabase の auth.updateUser は再認証を要求しないため、現在のパスワードは UX 上の
 *   ダブルチェックとして使う（API には送らない）。
 *
 * design プロト L418-444（PwChangeForm）を Vue 化したもの。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { passwordChangeSchema, type PasswordChangeSchema } from '#shared/types/schemas'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const toast = useToast()
const apiError = useApiError()

const state = reactive<Partial<PasswordChangeSchema>>({
  current: '',
  next: '',
  confirm: ''
})
const loading = ref(false)

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v)
})

// モーダルが閉じたら状態をリセットする（次回開いた時に空から始める）
watch(openModel, (opened) => {
  if (!opened) {
    state.current = ''
    state.next = ''
    state.confirm = ''
  }
})

// 送信処理本体。UForm @submit から呼ぶほか、テストでは defineExpose 経由で直接呼ぶ。
// 現在のパスワードは UX 上のダブルチェック用で API には送らず、新パスワードのみ送信する。
const submit = async (data: PasswordChangeSchema): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: { password: data.next }
    })
    toast.add({ title: 'パスワードを変更しました', color: 'success' })
    openModel.value = false
  } catch (error: unknown) {
    apiError.notify(error, { fallback: 'パスワードの変更に失敗しました' })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<PasswordChangeSchema>): Promise<void> => submit(event.data)

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="パスワード変更"
  >
    <template #body>
      <UForm
        :schema="passwordChangeSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          name="current"
          label="現在のパスワード"
          required
        >
          <UInput
            v-model="state.current"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="next"
          label="新しいパスワード"
          hint="8 文字以上"
          required
        >
          <UInput
            v-model="state.next"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="confirm"
          label="新しいパスワード（確認）"
          required
        >
          <UInput
            v-model="state.confirm"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="loading"
            @click="openModel = false"
          >
            キャンセル
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            変更する
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
