<script setup lang="ts">
/**
 * 管理者画面のユーザー一覧テーブル。
 *
 * - UTable + TanStack Column Defs でレスポンシブに表示する。
 * - 役割列は RoleBadge で色付きバッジ表示。
 * - 操作列: 編集ボタン（edit emit）・無効化/有効化ボタン（setActive emit）。
 * - 無効ユーザーは行を薄く（opacity-50）して視覚的に区別する。
 * - 無効化は ConfirmDialog で確認を取ってから emit する。
 */
import type { TableColumn } from '@nuxt/ui'
import type { UserRole } from '#shared/types/api'
import type { Profile } from '#shared/types/models'

withDefaults(
  defineProps<{
    /** 表示するユーザー一覧 */
    users: Profile[]
    /** テーブルのローディング状態 */
    loading?: boolean
    /** ログイン中ユーザーの id。自分の行は無効化を抑止し「あなた」バッジを出す。 */
    currentUserId?: string
  }>(),
  {
    loading: false,
    currentUserId: undefined
  }
)

const emit = defineEmits<{
  /** 編集ボタン押下時（対象ユーザーを渡す） */
  edit: [user: Profile]
  /** 有効化/無効化ボタン押下時（id と新しい is_active を渡す） */
  setActive: [id: string, isActive: boolean]
}>()

// 無効化確認ダイアログの状態
const confirmOpen = ref(false)
const confirmTargetId = ref<string | null>(null)

const onDeactivateClick = (id: string): void => {
  confirmTargetId.value = id
  confirmOpen.value = true
}

const onConfirmDeactivate = (): void => {
  if (confirmTargetId.value) {
    emit('setActive', confirmTargetId.value, false)
  }
  confirmOpen.value = false
  confirmTargetId.value = null
}

const onCancelDeactivate = (): void => {
  confirmOpen.value = false
  confirmTargetId.value = null
}

// Profile.role は DB 上 string。UserRole に絞り込んでバッジへ渡す（DB CHECK で常に妥当）。
const toRole = (v: string): UserRole => (isUserRole(v) ? v : 'trainee')

const columns: TableColumn<Profile>[] = [
  { accessorKey: 'employee_id', header: '社員ID' },
  { accessorKey: 'name', header: '名前' },
  { accessorKey: 'email', header: 'メール' },
  { id: 'role', accessorKey: 'role', header: '役割' },
  { id: 'actions', header: '操作', enableSorting: false }
]
</script>

<template>
  <!-- 無効化確認ダイアログ（teleport で body に出る） -->
  <ConfirmDialog
    :open="confirmOpen"
    title="ユーザーを無効化"
    message="このユーザーを無効化します。ログインできなくなります。よろしいですか？"
    confirm-label="無効化"
    confirm-color="error"
    @confirm="onConfirmDeactivate"
    @cancel="onCancelDeactivate"
    @update:open="(v) => { if (!v) onCancelDeactivate() }"
  />

  <div class="overflow-x-auto w-full">
    <UTable
      :data="users"
      :columns="columns"
      :loading="loading"
      :ui="{
        th: 'bg-muted text-muted text-xs font-semibold uppercase tracking-wider',
        tr: 'hover:bg-muted/40 transition-colors'
      }"
    >
      <!-- 取得中はスケルトン行を出す。空メッセージ（ユーザーがいません）は
           ロード完了後に本当に 0 件のときだけ表示する（#empty は行 0 件時のみ描画され、
           リフレッシュ時＝既存行ありには出ないため、進捗バー overlay の UX を保てる）。 -->
      <template #empty>
        <div
          v-if="loading"
          class="flex flex-col gap-2 py-2"
        >
          <USkeleton
            v-for="i in 5"
            :key="i"
            class="h-8 w-full"
          />
        </div>
        <template v-else>
          ユーザーがいません
        </template>
      </template>

      <!-- 社員ID: 等幅フォントで識別子らしい technical accent。無効ユーザーは薄く -->
      <template #employee_id-cell="{ row }">
        <span
          class="font-mono text-sm text-muted"
          :class="{ 'opacity-50': !row.original.is_active }"
        >{{ row.original.employee_id }}</span>
      </template>

      <!-- 名前: 強調表示＋無効ユーザーには「無効」バッジ -->
      <template #name-cell="{ row }">
        <div
          class="flex items-center gap-2"
          :class="{ 'opacity-50': !row.original.is_active }"
        >
          <span class="font-medium text-highlighted">{{ row.original.name }}</span>
          <UBadge
            v-if="row.original.id === currentUserId"
            label="あなた"
            color="primary"
            variant="soft"
            size="sm"
          />
          <UBadge
            v-if="!row.original.is_active"
            label="無効"
            color="neutral"
            variant="soft"
            size="sm"
          />
        </div>
      </template>

      <!-- メール: 無効ユーザーは薄く -->
      <template #email-cell="{ row }">
        <span
          class="text-muted"
          :class="{ 'opacity-50': !row.original.is_active }"
        >{{ row.original.email }}</span>
      </template>

      <!-- 役割セル: RoleBadge で色付きバッジ表示 -->
      <template #role-cell="{ row }">
        <RoleBadge
          :role="toRole(row.original.role)"
          :class="{ 'opacity-50': !row.original.is_active }"
        />
      </template>

      <!-- 操作セル: 編集ボタン＋有効/無効化ボタン -->
      <template #actions-cell="{ row }">
        <div
          class="flex items-center gap-2"
          :class="{ 'opacity-50': !row.original.is_active }"
        >
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            @click="emit('edit', row.original)"
          >
            編集
          </UButton>

          <!-- 有効ユーザー → 無効化ボタン（確認あり）。自分自身は無効化不可（自己ロックアウト防止） -->
          <UButton
            v-if="row.original.is_active"
            size="xs"
            variant="outline"
            color="error"
            :disabled="row.original.id === currentUserId"
            :title="row.original.id === currentUserId ? '自分自身は無効化できません' : undefined"
            @click="onDeactivateClick(row.original.id)"
          >
            無効化
          </UButton>

          <!-- 無効ユーザー → 有効化ボタン（即時） -->
          <UButton
            v-else
            size="xs"
            variant="outline"
            color="neutral"
            @click="emit('setActive', row.original.id, true)"
          >
            有効化
          </UButton>
        </div>
      </template>
    </UTable>
  </div>
</template>
