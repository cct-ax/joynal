<script setup lang="ts">
import { RESET_SUCCESS_QUERY_KEY, RESET_SUCCESS_QUERY_VALUE } from '~/utils/passwordReset'

definePageMeta({ layout: false })

const apiError = useApiError()
const toast = useToast()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)

// パスワードリセット成功で /login?reset=success に遷移してきたとき、完了 toast を出す。
// 再表示防止に query を除去する（replace でリロード無し）。
onMounted(() => {
  if (route.query[RESET_SUCCESS_QUERY_KEY] === RESET_SUCCESS_QUERY_VALUE) {
    toast.add({
      title: 'パスワードを更新しました。新しいパスワードでログインしてください。',
      color: 'success'
    })
    void navigateTo({ path: '/login', query: {} }, { replace: true })
  }
})

const signIn = async (): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
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
  <div class="relative flex min-h-screen items-center justify-center bg-muted px-5 py-8 text-default">
    <UColorModeButton
      color="neutral"
      variant="outline"
      size="sm"
      square
      class="fixed inset-e-4 top-4 z-10 cursor-pointer"
    />

    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-[32px] font-bold leading-none text-highlighted">
          Joynal
        </h1>
        <p class="mt-2 text-sm text-muted">
          今日の「楽しい」を、明日の成長へ
        </p>
      </div>

      <UCard
        class="shadow-sm"
        :ui="{
          body: 'p-7'
        }"
      >
        <UForm
          class="space-y-4"
          @submit="signIn"
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
            />
          </UFormField>

          <UFormField
            label="パスワード"
            name="password"
            required
          >
            <UInput
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
            :disabled="loading"
            class="mt-1 cursor-pointer"
          >
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </UButton>
        </UForm>

        <div class="mt-4 text-center">
          <NuxtLink
            to="/reset-password"
            class="text-sm text-primary transition hover:underline"
          >
            パスワードをお忘れの方はこちら
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
