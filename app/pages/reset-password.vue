<script setup lang="ts">
/**
 * パスワードリセット画面（OTP方式・単一フォーム）。
 *
 * 申請（確認コード送信）と新パスワード設定を 1 枚のフォームで行う。
 * コードは同一ブラウザに手入力する方式のため、リンク着地用の別ページや
 * クロスページの state 引き継ぎは不要。
 *
 * - 「送信/再送」: メール欄右のインラインボタン（type=button）。POST /api/auth/reset-password が
 *   resetPasswordForEmail で recovery OTP を送信する。フォーム送信ではないので email のみ検証する。
 * - 「パスワードを更新」: フォーム submit。POST /api/auth/reset-password-otp が
 *   verifyOtp(type=recovery) → updateUser → 全セッション失効（signOut）を行う。
 *   成功時は /login?reset=success へ external 遷移し、完了 toast は login 画面で出す。
 *
 * セキュリティ: 更新後はサーバー側で全セッションを失効させるため、/login へは external 遷移で
 * クライアント状態も確実にクリアする（リロードを跨ぐため完了表示は toast でなく遷移先で行う）。
 * リンク方式と違い redirect を使わないので Redirect URLs 登録は不要。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  resetPasswordSchema,
  resetWithOtpSchema,
  type ResetPasswordSchema,
  type ResetWithOtpSchema
} from '#shared/types/schemas'
import { RESET_SUCCESS_QUERY_KEY, RESET_SUCCESS_QUERY_VALUE } from '~/utils/passwordReset'

definePageMeta({ layout: false })

const apiError = useApiError()

const state = reactive({ email: '', token: '', password: '', confirm: '' })
const loading = ref(false) // 「パスワードを更新」送信中
const sendLoading = ref(false) // 「送信/再送」中（submit と分離）
const codeSent = ref(false) // 送信済みヒント表示＋ボタン文言切替
const emailError = ref('') // 送信ボタン押下時の email 単独検証エラー（フィールドにインライン表示）

// メールを編集したら「送信済み」状態と email エラーをリセットする（別アドレスに送った誤認を防ぐ）。
watch(() => state.email, () => {
  codeSent.value = false
  emailError.value = ''
})

// メール欄右のボタンから呼ぶ。フォーム送信ではないので email のみ検証してコードを送信する。
// テストでは defineExpose 経由で直接呼ぶ。
const requestCode = async (data: ResetPasswordSchema): Promise<void> => {
  const parsed = resetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    emailError.value = parsed.error.issues[0]?.message ?? '有効なメールアドレスを入力してください'
    return
  }
  emailError.value = ''
  sendLoading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: parsed.data.email }
    })
    codeSent.value = true
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 404: 'このメールアドレスは登録されていません' },
      fallback: 'メールの送信に失敗しました'
    })
  } finally {
    sendLoading.value = false
  }
}

// フォーム submit。コードを検証して新パスワードを反映する。confirm はクライアント検証用なので送らない。
const submitNewPassword = async (data: ResetWithOtpSchema): Promise<void> => {
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password-otp', {
      method: 'POST',
      body: {
        email: data.email,
        token: data.token,
        password: data.password
      }
    })
    // セッションは失効済みのため external 遷移でクライアント状態をクリアし、完了 toast は login 側で出す。
    await navigateTo(`/login?${RESET_SUCCESS_QUERY_KEY}=${RESET_SUCCESS_QUERY_VALUE}`, { external: true })
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 400: 'コードが正しくないか期限切れです。再度お試しください' },
      codeMessages: { SAME_PASSWORD: '新しいパスワードは現在のパスワードと異なるものを設定してください' },
      fallback: 'パスワードの更新に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

// UForm の @submit はバリデーション済みデータを event.data で渡す。
const onSubmitNewPassword = (event: FormSubmitEvent<ResetWithOtpSchema>): Promise<void> => submitNewPassword(event.data)

defineExpose({ requestCode, submitNewPassword })
</script>

<template>
  <AuthCard>
    <template #header>
      <h1 class="text-xl font-bold tracking-tight">
        パスワードリセット
      </h1>
    </template>

    <!-- 単一フォーム（メール入力＋コード送信＋新パスワード設定） -->
    <UForm
      :schema="resetWithOtpSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmitNewPassword"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        メールアドレスを入力して確認コードを送信し、届いたコードと新しいパスワード（8文字以上）を入力してください。
      </p>
      <UFormField
        name="email"
        label="メールアドレス"
        required
        :error="emailError || undefined"
      >
        <div class="flex gap-2">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            spellcheck="false"
            autocapitalize="none"
            placeholder="mail@example.com"
            class="flex-1"
          />
          <UButton
            type="button"
            color="neutral"
            variant="subtle"
            :loading="sendLoading"
            @click="requestCode({ email: state.email })"
          >
            {{ codeSent ? '再送' : '送信' }}
          </UButton>
        </div>
        <p
          v-if="codeSent"
          role="status"
          class="mt-1 text-sm text-green-600 dark:text-green-400"
        >
          ✓ 確認コードを送信しました
        </p>
      </UFormField>
      <UFormField
        name="token"
        label="確認コード"
        required
      >
        <UInput
          v-model="state.token"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="8"
          placeholder="メールに記載のコード"
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
        to="/login"
        class="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← ログイン画面に戻る
      </NuxtLink>
    </template>
  </AuthCard>
</template>
