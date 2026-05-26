<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)

const close = () => {
  emit('close')
}

const handleOpenChange = (open: boolean) => {
  if (!open) {
    close()
  }
}

const submit = async () => {
  errorMessage.value = ''

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    errorMessage.value = 'すべての項目を入力してください'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = '新しいパスワードは6文字以上で入力してください'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '新しいパスワードが一致しません'
    return
  }

  if (!user.value?.email) {
    errorMessage.value = 'ログイン情報を確認できませんでした'
    return
  }

  loading.value = true

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.value.email,
    password: currentPassword.value
  })

  if (signInError) {
    errorMessage.value = '現在のパスワードが正しくありません'
    loading.value = false
    return
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword.value
  })

  if (updateError) {
    errorMessage.value = 'パスワードの変更に失敗しました'
    loading.value = false
    return
  }

  loading.value = false
  close()
}
</script>

<template>
  <UModal
    :open="true"
    title="パスワード変更"
    class="w-full max-w-sm"
    :ui="{
      content: 'overflow-hidden rounded-lg bg-white shadow-lg',
      header: 'border-b border-[#e5e7eb] px-5 py-3.5',
      title: 'text-base font-semibold text-[#111827]',
      body: 'overflow-y-auto p-5',
      close: 'cursor-pointer text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] focus:ring-4 focus:ring-[#c7d2fe]'
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <UForm
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          label="現在のパスワード"
          name="current-password"
        >
          <UInput
            id="current-password"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField
          label="新しいパスワード"
          name="new-password"
        >
          <UInput
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField
          label="新しいパスワード（確認）"
          name="confirm-password"
        >
          <UInput
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <p
          v-if="errorMessage"
          class="text-sm text-[#dc2626]"
        >
          {{ errorMessage }}
        </p>

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
