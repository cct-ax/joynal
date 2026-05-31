<script setup lang="ts">
/**
 * パスワードリセット申請画面。
 * メールアドレスを入力すると、Supabase が6桁の確認コード（recovery OTP）をメール送信する。
 * 入力した email は useState で /reset-password に引き継ぎ、コード入力画面へ遷移する。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { resetPasswordSchema, type ResetPasswordSchema } from '#shared/types/schemas'

definePageMeta({ layout: false })

const apiError = useApiError()
const resetEmail = useState<string>('reset-email', () => '')

const state = reactive<Partial<ResetPasswordSchema>>({ email: '' })
const loading = ref(false)

const onSubmit = async (event: FormSubmitEvent<ResetPasswordSchema>): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: event.data.email }
    })
    // 送信成功（登録済み）のときだけコード入力画面へ進む。email は引き継ぐ。
    resetEmail.value = event.data.email
    await navigateTo('/reset-password')
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 404: 'このメールアドレスは登録されていません' },
      fallback: 'メールの送信に失敗しました'
    })
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

    <UForm
      :schema="resetPasswordSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        登録済みのメールアドレスを入力してください。確認コードをメールで送信します。
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
        確認コードを送信
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
