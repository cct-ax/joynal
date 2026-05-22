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
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="password-change-title"
  >
    <div class="flex max-h-[calc(100dvh-32px)] w-full max-w-sm flex-col overflow-hidden rounded-lg bg-white shadow-lg">
      <div class="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-5 py-3.5">
        <h2
          id="password-change-title"
          class="text-base font-semibold text-[#111827]"
        >
          パスワード変更
        </h2>
        <button
          type="button"
          class="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827] focus:outline-none focus:ring-4 focus:ring-[#c7d2fe]"
          aria-label="閉じる"
          @click="close"
        >
          <UIcon
            name="i-lucide-x"
            class="size-5"
          />
        </button>
      </div>

      <form
        class="space-y-4 overflow-y-auto p-5"
        @submit.prevent="submit"
      >
        <div>
          <label
            for="current-password"
            class="mb-1.5 block text-sm font-medium text-[#374151]"
          >
            現在のパスワード
          </label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#6366f1] focus:ring-4 focus:ring-[#c7d2fe]"
          >
        </div>

        <div>
          <label
            for="new-password"
            class="mb-1.5 block text-sm font-medium text-[#374151]"
          >
            新しいパスワード
          </label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#6366f1] focus:ring-4 focus:ring-[#c7d2fe]"
          >
        </div>

        <div>
          <label
            for="confirm-password"
            class="mb-1.5 block text-sm font-medium text-[#374151]"
          >
            新しいパスワード（確認）
          </label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#6366f1] focus:ring-4 focus:ring-[#c7d2fe]"
          >
        </div>

        <p
          v-if="errorMessage"
          class="text-sm text-[#dc2626]"
        >
          {{ errorMessage }}
        </p>

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] focus:outline-none focus:ring-4 focus:ring-[#c7d2fe]"
            @click="close"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-[#4f46e5] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#c7d2fe] disabled:cursor-not-allowed disabled:bg-[#c7d2fe]"
            :disabled="loading"
          >
            {{ loading ? '変更中...' : '変更する' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
