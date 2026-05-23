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
  <div class="flex min-h-screen items-center justify-center bg-[#f9fafb] px-5 py-8">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-[32px] font-bold leading-none text-[#111827]">
          Joynal
        </h1>
        <p class="mt-2 text-sm text-[#6b7280]">
          今日の「楽しい」を、明日の成長へ
        </p>
      </div>

      <UCard
        :ui="{
          root: 'rounded-lg border border-[#e5e7eb] bg-white shadow-sm',
          body: 'p-7'
        }"
      >
        <form
          class="space-y-4"
          @submit.prevent="signIn"
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

          <div>
            <label
              for="password"
              class="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              パスワード
            </label>
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
          </div>

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
            class="mt-1 cursor-pointer justify-center bg-[#4f46e5] hover:bg-[#4338ca]"
          >
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </UButton>
        </form>

        <div class="mt-4 text-center">
          <NuxtLink
            to="/reset-password"
            class="text-sm text-[#4f46e5] transition hover:underline"
          >
            パスワードをお忘れの方はこちら
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
