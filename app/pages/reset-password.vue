<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()

const email = ref('')
const successMessage = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function sendResetEmail() {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/confirm`,
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
  <div>
    <h1>パスワードリセット</h1>

    <form @submit.prevent="sendResetEmail">
      <div>
        <label for="email">メールアドレス</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" />
      </div>

      <p v-if="successMessage">{{ successMessage }}</p>
      <p v-if="errorMessage">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '送信中...' : 'リセットメールを送信' }}
      </button>
    </form>

    <NuxtLink to="/login">ログインに戻る</NuxtLink>
  </div>
</template>
