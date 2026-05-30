<script setup lang="ts">
/**
 * ユーザー編集モーダル（管理者専用）。
 *
 * - CommentInputModal と同じ UModal パターン（全画面モバイル対応、defineExpose）。
 * - `user` props が変わるたびに state を再初期化する（immediate: true）。
 * - PUT /api/users/[id] でユーザー情報を更新する。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { userUpdateSchema, type UserUpdateSchema } from '#shared/types/schemas'
import type { UserRole } from '#shared/types/api'
import type { Profile } from '#shared/types/models'

const open = defineModel<boolean>('open')

const props = defineProps<{
  user: Profile | null
}>()

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const apiError = useApiError()
const loading = ref(false)

// 役割セレクトの選択肢。value-key="value" で v-model は UserRole 文字列になり state.role に直結する。
const roleOptions = (VALID_ROLES as readonly UserRole[]).map(r => ({
  label: ROLE_LABELS[r],
  value: r
}))

const state = reactive<Partial<UserUpdateSchema>>({
  name: undefined,
  email: undefined,
  role: undefined
})

// モーダルの開閉・編集対象の変化に追従して state を初期化する。
// 開く時は対象ユーザー情報を反映し、閉じる時はリセットする。
watch(
  open,
  (opened) => {
    if (opened && props.user) {
      state.name = props.user.name
      state.email = props.user.email
      state.role = props.user.role as UserRole
    } else {
      state.name = undefined
      state.email = undefined
      state.role = undefined
    }
  },
  { immediate: true }
)

const close = (): void => {
  open.value = false
}

/**
 * フォーム送信処理。テストでは defineExpose 経由で直接呼ぶ。
 */
const submit = async (data: UserUpdateSchema): Promise<void> => {
  if (!props.user) return
  loading.value = true
  try {
    await $fetch(`/api/users/${props.user.id}`, {
      method: 'PUT',
      body: { name: data.name, email: data.email, role: data.role }
    })
    toast.add({ title: '更新しました', color: 'success' })
    emit('saved')
    open.value = false
  } catch (error: unknown) {
    apiError.notify(error, {
      fallback: 'ユーザー情報の更新に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<UserUpdateSchema>): Promise<void> => submit(event.data)

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="open"
    title="ユーザーを編集"
    :ui="{
      content: 'max-sm:w-screen! max-sm:h-dvh! max-sm:max-w-none! max-sm:rounded-none! sm:max-w-lg'
    }"
  >
    <template #body>
      <UForm
        :schema="userUpdateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          name="name"
          label="名前"
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
            更新
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
