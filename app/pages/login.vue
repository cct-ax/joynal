<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginSchema } from '~/types/schemas'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()
const authError = useSupabaseAuthError()

const state = reactive<Partial<LoginSchema>>({
  email: undefined,
  password: undefined
})
const loading = ref(false)

const onSubmit = async (event: FormSubmitEvent<LoginSchema>): Promise<void> => {
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword(event.data)
    if (error) {
      authError.notify(error, {
        title: 'メールアドレスまたはパスワードが正しくありません'
      })
      return
    }
    await router.push('/report')
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
