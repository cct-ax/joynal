<script setup lang="ts">
/**
 * 新パスワード設定画面（OTP方式）。
 *
 * /forgot-password で送信した6桁の確認コードと新パスワードを入力する。
 * /api/auth/reset-password-otp が verifyOtp でコードを検証 → updateUser → 全セッション失効。
 * email は /forgot-password から useState で引き継ぐ（直接アクセス/リロード時は入力可）。
 *
 * セキュリティ: 更新後はサーバー側で全セッションを失効させ、/login で再ログインを促す。
 * リンク方式と違い redirect を一切使わないため /reset-password を Redirect URLs に登録する必要は無い。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { resetWithOtpSchema, type ResetWithOtpSchema } from '#shared/types/schemas'

definePageMeta({ layout: false })

const apiError = useApiError()
const resetEmail = useState<string>('reset-email', () => '')

const state = reactive<Partial<ResetWithOtpSchema>>({
  email: resetEmail.value,
  token: '',
  password: '',
  confirm: ''
})
const loading = ref(false)
const done = ref(false)

const onSubmit = async (event: FormSubmitEvent<ResetWithOtpSchema>): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password-otp', {
      method: 'POST',
      body: {
        email: event.data.email,
        token: event.data.token,
        password: event.data.password
      }
    })
    done.value = true
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 400: 'コードが正しくないか期限切れです。再度お試しください' },
      fallback: 'パスワードの更新に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

// セッションは失効済みのため external 遷移でクライアント状態も確実にクリアする。
const goToLogin = (): void => {
  void navigateTo('/login', { external: true })
}
</script>

<template>
  <AuthCard>
    <template #header>
      <h1 class="text-xl font-bold tracking-tight">
        新しいパスワードの設定
      </h1>
    </template>

    <div
      v-if="done"
      class="space-y-4"
    >
      <EmptyState
        emoji="✅"
        message="パスワードを更新しました。新しいパスワードでログインしてください。"
      />
      <UButton
        block
        @click="goToLogin"
      >
        ログイン画面へ
      </UButton>
    </div>

    <UForm
      v-else
      :schema="resetWithOtpSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        メールに届いた6桁の確認コードと、新しいパスワード（8文字以上）を入力してください。
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
      <UFormField
        name="token"
        label="確認コード（6桁）"
        required
      >
        <UInput
          v-model="state.token"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="123456"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="password"
        label="新しいパスワード"
        required
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="confirm"
        label="新しいパスワード（確認）"
        required
      >
        <UInput
          v-model="state.confirm"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        :loading="loading"
        block
      >
        パスワードを更新
      </UButton>
    </UForm>

    <template #footer>
      <NuxtLink
        to="/forgot-password"
        class="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        コードを再送する
      </NuxtLink>
    </template>
  </AuthCard>
</template>
