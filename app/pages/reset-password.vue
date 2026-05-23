<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()

const email = ref('')
const successMessage = ref('')
const errorMessage = ref('')
const loading = ref(false)

const sendResetEmail = async () => {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/confirm`
  })

  if (error) {
    errorMessage.value = 'メールの送信に失敗しました。メールアドレスを確認してください'
  } else {
    successMessage.value = 'パスワードリセットメールを送信しました。メールをご確認ください'
  }

  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#f9fafb] px-5 py-8">
    <UCard
      class="w-full max-w-sm"
      :ui="{
        root: 'rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
        body: 'p-7'
      }"
    >
      <div class="mb-5">
        <h1 class="text-xl font-bold text-[#111827]">
          パスワードリセット
        </h1>
        <p class="mt-2 text-sm text-[#6b7280]">
          登録済みのメールアドレスを入力してください。
        </p>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="sendResetEmail"
      >
        <div>
          <label
            for="email"
            class="mb-1.5 block text-sm font-medium text-[#374151]"
          >
            メールアドレス
          </label>
          <UInput
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="mail@example.com"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <p
          v-if="successMessage"
          class="text-sm text-[#16a34a]"
        >
          {{ successMessage }}
        </p>
        <p
          v-if="errorMessage"
          class="text-sm text-[#dc2626]"
        >
          {{ errorMessage }}
        </p>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="loading"
          :disabled="loading"
          class="cursor-pointer justify-center bg-[#4f46e5] hover:bg-[#4338ca]"
        >
          {{ loading ? '送信中...' : 'リセットメールを送信' }}
        </UButton>
      </form>

      <div class="mt-5">
        <NuxtLink
          to="/login"
          class="text-sm text-[#4f46e5] transition hover:underline"
        >
          ← ログイン画面に戻る
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
