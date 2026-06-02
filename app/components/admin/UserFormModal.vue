<script setup lang="ts">
/**
 * ユーザー招待・編集モーダル（管理者専用）。
 *
 * - `user` が未指定/null なら招待（POST /api/users）、null 以外なら編集（PUT /api/users/[id]）。
 *   ReportInputModal と同じ「entity prop の有無でモード判定」パターン。
 * - CommentInputModal と同じ UModal パターン（全画面モバイル対応、defineExpose）。
 * - 役割選択は USelectMenu（value-key="value" で v-model は UserRole 文字列）。
 * - フォームは name/employee_id/email/role を常に必須とする（is_active は UserTable 側で扱う）。
 * - 409（メール重複）は専用エラーメッセージを表示。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { userCreateSchema, type UserCreateSchema } from '#shared/types/schemas'
import type { Profile } from '#shared/types/models'

/** モーダルの開閉状態（v-model:open） */
const open = defineModel<boolean>('open')

const props = defineProps<{
  /** 編集対象ユーザー（null / undefined なら招待モード） */
  user?: Profile | null
  /** ログイン中ユーザーの id。自分自身の編集時は役割変更を抑止する。 */
  currentUserId?: string
}>()

const emit = defineEmits<{
  /** 保存完了時（親側でユーザー一覧を再取得する） */
  saved: []
}>()

const toast = useToast()

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
const roleOptions = VALID_ROLES.map(r => ({
  label: ROLE_LABELS[r],
  value: r
}))

const close = (): void => {
  open.value = false
}

// 開閉リセット＋submit の loading/error 定型は useModalForm に集約する。
// 開く時は編集対象（あれば）を反映し、招待時・閉じる時は空にリセットする。
const { state, loading, submit } = useModalForm<UserCreateSchema, Partial<UserCreateSchema>>({
  isOpen: () => open.value ?? false,
  buildState: () =>
    open.value && props.user
      ? {
          name: props.user.name,
          employee_id: props.user.employee_id,
          email: props.user.email,
          role: isUserRole(props.user.role) ? props.user.role : undefined
        }
      : { name: '', employee_id: '', email: '', role: undefined },
  // 送信処理本体。user があれば PUT（更新）、なければ POST（招待）。
  onSubmit: async (data) => {
    const body = { name: data.name, employee_id: data.employee_id, email: data.email, role: data.role }
    if (isEdit.value && props.user) {
      await $fetch(`/api/users/${props.user.id}`, { method: 'PUT', body })
      toast.add({ title: '更新しました', color: 'success' })
    } else {
      await $fetch('/api/users', { method: 'POST', body })
      toast.add({ title: '招待しました', color: 'success' })
    }
    emit('saved')
    close()
  },
  errorOptions: () => ({
    statusMessages: { 409: 'このメールアドレスは既に登録されています' },
    codeMessages: { EMPLOYEE_ID_TAKEN: 'この社員IDは既に使用されています' },
    fallback: isEdit.value ? 'ユーザー情報の更新に失敗しました' : 'ユーザーの追加に失敗しました'
  })
})

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
          name="employee_id"
          label="社員ID"
          required
        >
          <UInput
            v-model="state.employee_id"
            placeholder="例: E001 / 2024-1234"
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
