<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { UpdatePasswordResponse } from '#shared/types/api'
import {
  passwordChangeSchema,
  type PasswordChangeSchema
} from '#shared/types/schemas'

const open = defineModel<boolean>('open', { required: true })
const form = useTemplateRef('form')

const state = reactive<Partial<PasswordChangeSchema>>({
  current: '',
  next: '',
  confirm: ''
})

const toast = useToast()
const loading = ref(false)

const resetForm = (): void => {
  state.current = ''
  state.next = ''
  state.confirm = ''
  form.value?.clear()
}

const close = (): void => {
  open.value = false
}

watch(open, (isOpen): void => {
  if (!isOpen) {
    resetForm()
  }
})

const submit = async (event: FormSubmitEvent<PasswordChangeSchema>): Promise<void> => {
  loading.value = true
  const body = { password: event.data.next }

  try {
    await $fetch<UpdatePasswordResponse>('/api/auth/update-password', {
      method: 'POST',
      body
    })
    toast.add({ title: 'パスワードを変更しました', color: 'success' })
    close()
  } catch {
    toast.add({ title: 'パスワードの変更に失敗しました', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="パスワード変更"
    class="w-full max-w-sm"
    :ui="{
      header: 'px-5 py-3.5',
      title: 'text-base',
      body: 'p-5',
      close: 'cursor-pointer'
    }"
  >
    <template #body>
      <UForm
        ref="form"
        :schema="passwordChangeSchema"
        :state="state"
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          label="現在のパスワード"
          name="current"
          required
        >
          <UInput
            id="current-password"
            v-model="state.current"
            type="password"
            autocomplete="current-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField
          label="新しいパスワード"
          name="next"
          required
        >
          <UInput
            id="new-password"
            v-model="state.next"
            type="password"
            autocomplete="new-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField
          label="新しいパスワード（確認）"
          name="confirm"
          required
        >
          <UInput
            id="confirm-password"
            v-model="state.confirm"
            type="password"
            autocomplete="new-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-1">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="close"
          >
            キャンセル
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
            :disabled="loading"
            class="cursor-pointer"
          >
            {{ loading ? '変更中...' : '変更する' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
