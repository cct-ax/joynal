<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { resetPasswordSchema, type ResetPasswordSchema } from '#shared/types/schemas'

definePageMeta({ layout: false })

const apiError = useApiError()

const state = reactive<Partial<ResetPasswordSchema>>({ email: undefined })
const loading = ref(false)
const sent = ref(false)

const onSubmit = async (event: FormSubmitEvent<ResetPasswordSchema>): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: event.data.email }
    })
    sent.value = true
  } catch (error: unknown) {
    apiError.notify(error, { fallback: 'メールの送信に失敗しました' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthCard>
    <template #header>
      <h1 class="text-xl font-bold tracking-tight">
        パスワードリセット
      </h1>
    </template>

    <EmptyState
      v-if="sent"
      emoji="📧"
      message="リセットメールを送信しました。メールをご確認ください。"
    />

    <UForm
      v-else
      :schema="resetPasswordSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        登録済みのメールアドレスを入力してください。
      </p>
      <UFormField
        name="email"
        label="メールアドレス"
        required
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          spellcheck="false"
          autocapitalize="none"
          placeholder="mail@example.com"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        :loading="loading"
        block
      >
        リセットメールを送信
      </UButton>
    </UForm>

    <template #footer>
      <NuxtLink
        to="/login"
        class="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← ログイン画面に戻る
      </NuxtLink>
    </template>
  </AuthCard>
</template>
