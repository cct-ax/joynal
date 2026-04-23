<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function signIn() {
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
  <div>
    <h1>Joynal</h1>
    <p>今日の「楽しい」を、明日の成長へ</p>

    <form @submit.prevent="signIn">
      <div>
        <label for="email">メールアドレス</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
        >
      </div>

      <div>
        <label for="password">パスワード</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
        >
      </div>

      <p v-if="errorMessage">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        :disabled="loading"
      >
        {{ loading ? 'ログイン中...' : 'ログイン' }}
      </button>
    </form>

    <NuxtLink to="/reset-password">パスワードをお忘れですか？</NuxtLink>
  </div>
</template>
