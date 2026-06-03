<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { UpdatePasswordResponse } from '#shared/types/api'
import {
  passwordChangeSchema,
  type PasswordChangeSchema,
  type UpdatePasswordBody
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
  const body: UpdatePasswordBody = { password: event.data.next }

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
      content: 'overflow-hidden rounded-lg bg-white shadow-lg',
      header: 'border-b border-[#e5e7eb] px-5 py-3.5',
      title: 'text-base font-semibold text-[#111827]',
      body: 'overflow-y-auto p-5',
      close: 'cursor-pointer text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] focus:ring-4 focus:ring-[#c7d2fe]'
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
            class="cursor-pointer bg-[#4f46e5] hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-[#c7d2fe]"
          >
            {{ loading ? '変更中...' : '変更する' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
