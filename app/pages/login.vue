<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginSchema } from '#shared/types/schemas'

definePageMeta({ layout: false })

const apiError = useApiError()

const state = reactive<Partial<LoginSchema>>({
  email: undefined,
  password: undefined
})
const loading = ref(false)

const onSubmit = async (event: FormSubmitEvent<LoginSchema>): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    // サーバーが Set-Cookie でセッションを発行するため、フルリロード（external）で
    // @nuxtjs/supabase クライアントにセッションを反映させてから /report へ遷移する。
    await navigateTo('/report', { external: true })
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 401: 'メールアドレスまたはパスワードが正しくありません' },
      fallback: 'ログインに失敗しました'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthCard
    title="Joynal"
    subtitle="新人研修 日報管理システム"
  >
    <UForm
      :schema="loginSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
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
        name="password"
        label="パスワード"
        required
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        :loading="loading"
        block
      >
        ログイン
      </UButton>
    </UForm>

    <template #footer>
      <NuxtLink
        to="/reset-password"
        class="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        パスワードをお忘れの方はこちら
      </NuxtLink>
    </template>
  </AuthCard>
</template>
