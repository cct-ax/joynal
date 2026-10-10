<script setup lang="ts">
/** ログインページ。メールアドレスとパスワードで認証し、成功後 /report へ遷移する。 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginSchema } from '#shared/types/schemas'
import { RESET_SUCCESS_QUERY_KEY, RESET_SUCCESS_QUERY_VALUE } from '~/utils/passwordReset'

definePageMeta({ layout: false })

const apiError = useApiError()
const toast = useToast()
const route = useRoute()

const state = reactive<Partial<LoginSchema>>({
  email: '',
  password: ''
})
const loading = ref(false)

// パスワードリセット成功で /login?reset=success に遷移してきたとき、完了 toast を出す。
// ssr:false（CSR）のため onMounted で実行し、再表示防止に query を除去する（replace でリロード無し）。
onMounted(() => {
  if (route.query[RESET_SUCCESS_QUERY_KEY] === RESET_SUCCESS_QUERY_VALUE) {
    toast.add({
      title: 'パスワードを更新しました。新しいパスワードでログインしてください。',
      color: 'success'
    })
    void navigateTo({ path: '/login', query: {} }, { replace: true })
  }
})

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
