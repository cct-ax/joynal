<script setup lang="ts">
/**
 * ユーザー招待・編集モーダル（管理者専用）。
 *
 * - `user` が未指定/null なら招待（POST /api/users）、null 以外なら編集（PUT /api/users/[id]）。
 *   ReportInputModal と同じ「entity prop の有無でモード判定」パターン。
 * - CommentInputModal と同じ UModal パターン（全画面モバイル対応、defineExpose）。
 * - 役割選択は USelectMenu（value-key="value" で v-model は UserRole 文字列）。
 * - フォームは name/email/role を常に必須とする（is_active は UserTable 側で扱う）。
 * - 409（メール重複）は専用エラーメッセージを表示。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { userCreateSchema, type UserCreateSchema } from '#shared/types/schemas'
import type { UserRole } from '#shared/types/api'
import type { Profile } from '#shared/types/models'

const open = defineModel<boolean>('open')

const props = defineProps<{
  user?: Profile | null
  /** ログイン中ユーザーの id。自分自身の編集時は役割変更を抑止する。 */
  currentUserId?: string
}>()

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const apiError = useApiError()
const loading = ref(false)

// user の有無でモード判定する（null/undefined = 招待、それ以外 = 編集）。
const isEdit = computed(() => props.user != null)
const title = computed(() => (isEdit.value ? 'ユーザーを編集' : 'ユーザーを招待'))
const submitLabel = computed(() => (isEdit.value ? '更新' : '招待する'))

// 自分自身を編集しているか。自己降格（最後の admin 喪失）を防ぐため役割セレクトを非活性にする。
const isSelf = computed(
  () => isEdit.value && props.user?.id != null && props.user.id === props.currentUserId
)

// 役割セレクトの選択肢（VALID_ROLES + ROLE_LABELS で生成）。
// value-key="value" により USelectMenu の v-model は UserRole 文字列になるので state.role に直結する。
const roleOptions = (VALID_ROLES as readonly UserRole[]).map(r => ({
  label: ROLE_LABELS[r],
  value: r
}))

const state = reactive<Partial<UserCreateSchema>>({
  name: undefined,
  email: undefined,
  role: undefined
})

// モーダルの開閉・編集対象の変化に追従して state を初期化する。
// 開く時は編集対象（あれば）を反映し、招待時・閉じる時は空にリセットする。
watch(
  open,
  (opened) => {
    if (opened && props.user) {
      state.name = props.user.name
      state.email = props.user.email
      state.role = props.user.role as UserRole
    } else {
      state.name = undefined
      state.email = undefined
      state.role = undefined
    }
  },
  { immediate: true }
)

const close = (): void => {
  open.value = false
}

/**
 * フォーム送信処理。テストでは defineExpose 経由で直接呼ぶ。
 * user があれば PUT（更新）、なければ POST（招待）。
 */
const submit = async (data: UserCreateSchema): Promise<void> => {
  loading.value = true
  try {
    const body = { name: data.name, email: data.email, role: data.role }
    if (isEdit.value && props.user) {
      await $fetch(`/api/users/${props.user.id}`, { method: 'PUT', body })
      toast.add({ title: '更新しました', color: 'success' })
    } else {
      await $fetch('/api/users', { method: 'POST', body })
      toast.add({ title: '招待しました', color: 'success' })
    }
    emit('saved')
    open.value = false
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 409: 'このメールアドレスは既に登録されています' },
      fallback: isEdit.value ? 'ユーザー情報の更新に失敗しました' : 'ユーザーの追加に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<UserCreateSchema>): Promise<void> => submit(event.data)

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{
      content: 'max-sm:w-screen! max-sm:h-dvh! max-sm:max-w-none! max-sm:rounded-none! sm:max-w-lg'
    }"
  >
    <template #body>
      <UForm
        :schema="userCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          name="name"
          label="名前"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="例: 山田 太郎"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="email"
          label="メールアドレス"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            placeholder="例: taro@example.com"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="role"
          label="役割"
          required
          :help="isSelf ? '自分自身の権限は変更できません' : undefined"
        >
          <USelectMenu
            v-model="state.role"
            :items="roleOptions"
            value-key="value"
            :disabled="isSelf"
            placeholder="役割を選択"
            aria-label="役割"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="loading"
            @click="close"
          >
            キャンセル
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            {{ submitLabel }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
