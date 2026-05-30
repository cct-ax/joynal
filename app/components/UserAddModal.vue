<script setup lang="ts">
/**
 * ユーザー招待モーダル（管理者専用）。
 *
 * - CommentInputModal と同じ UModal パターン（全画面モバイル対応、defineExpose）。
 * - 役割選択は TraineeSelector と同じ USelectMenu パターン（null↔undefined proxy）。
 * - POST /api/users で招待メールを送信する。
 * - 409（メール重複）は専用エラーメッセージを表示。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { userCreateSchema, type UserCreateSchema } from '#shared/types/schemas'
import type { UserRole } from '#shared/types/api'

const open = defineModel<boolean>('open')

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const apiError = useApiError()
const loading = ref(false)

// 役割セレクトの選択肢（VALID_ROLES + ROLE_LABELS で生成）。
// value-key="value" により USelectMenu の v-model は UserRole 文字列になるので state.role に直結する。
const roleOptions = (VALID_ROLES as readonly UserRole[]).map(r => ({
  label: ROLE_LABELS[r],
  value: r
}))

const state = reactive<Partial<UserCreateSchema>>({
  name: undefined,
  email: undefined,
  role: undefined
})

// モーダルを閉じたときは state をリセットする。
watch(open, (opened) => {
  if (!opened) {
    state.name = undefined
    state.email = undefined
    state.role = undefined
  }
})

const close = (): void => {
  open.value = false
}

/**
 * フォーム送信処理。テストでは defineExpose 経由で直接呼ぶ。
 */
const submit = async (data: UserCreateSchema): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: { name: data.name, email: data.email, role: data.role }
    })
    toast.add({ title: '招待しました', color: 'success' })
    emit('saved')
    open.value = false
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 409: 'このメールアドレスは既に登録されています' },
      fallback: 'ユーザーの追加に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<UserCreateSchema>): Promise<void> => submit(event.data)

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="open"
    title="ユーザーを招待"
    :ui="{
      content: 'max-sm:w-screen! max-sm:h-dvh! max-sm:max-w-none! max-sm:rounded-none! sm:max-w-lg'
    }"
  >
    <template #body>
      <UForm
        :schema="userCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          name="name"
          label="名前"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="例: 山田 太郎"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="email"
          label="メールアドレス"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            placeholder="例: taro@example.com"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="role"
          label="役割"
          required
        >
          <USelectMenu
            v-model="state.role"
            :items="roleOptions"
            value-key="value"
            placeholder="役割を選択"
            aria-label="役割"
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
            招待する
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
