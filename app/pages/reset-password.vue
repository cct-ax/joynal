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
  <div class="relative flex min-h-screen items-center justify-center bg-muted px-5 py-8 text-default">
    <UColorModeButton
      color="neutral"
      variant="outline"
      size="sm"
      square
      class="fixed end-4 top-4 z-10 cursor-pointer"
    />

    <UCard
      class="w-full max-w-sm shadow-sm"
      :ui="{
        body: 'p-7'
      }"
    >
      <div class="mb-5">
        <h1 class="text-xl font-bold text-highlighted">
          パスワードリセット
        </h1>
        <p class="mt-2 text-sm text-muted">
          登録済みのメールアドレスを入力してください。
        </p>
      </div>

      <UForm
        class="space-y-4"
        @submit="sendResetEmail"
      >
        <UFormField
          label="メールアドレス"
          name="email"
          required
        >
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
        </UFormField>

        <p
          v-if="successMessage"
          class="text-sm text-success"
        >
          {{ successMessage }}
        </p>
        <p
          v-if="errorMessage"
          class="text-sm text-error"
        >
          {{ errorMessage }}
        </p>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="loading"
          :disabled="loading"
          class="cursor-pointer"
        >
          {{ loading ? '送信中...' : 'リセットメールを送信' }}
        </UButton>
      </UForm>

      <div class="mt-5">
        <NuxtLink
          to="/login"
          class="text-sm text-primary transition hover:underline"
        >
          ← ログイン画面に戻る
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
