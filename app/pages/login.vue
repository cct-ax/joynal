<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const signIn = async () => {
  loading.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMessage.value = 'メールアドレスまたはパスワードが正しくありません'
  } else {
    await router.push('/report')
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
              :ui="{ base: 'w-full' }"
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
              :ui="{ base: 'w-full' }"
            />
          </UFormField>

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
