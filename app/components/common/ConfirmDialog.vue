<script setup lang="ts">
/**
 * 汎用確認ダイアログ。
 *
 * - 削除など破壊的操作の前に確認を取るために使う。
 * - UModal ベースで、open は v-model:open で制御する。
 * - confirm 後の close 制御は親側で行う（ローディング表示を維持するため）。
 *
 * 例:
 *   <ConfirmDialog
 *     v-model:open="confirmOpen"
 *     title="日報を削除"
 *     message="この日報を削除します。よろしいですか？"
 *     :loading="deleting"
 *     @confirm="onDelete"
 *   />
 */
const props = withDefaults(
  defineProps<{
    /** 開閉状態（v-model:open） */
    open: boolean
    /** ダイアログ見出し */
    title?: string
    /** 本文メッセージ */
    message: string
    /** 確認ボタンのラベル */
    confirmLabel?: string
    /** キャンセルボタンのラベル */
    cancelLabel?: string
    /** 確認ボタンの色（error=破壊的操作、primary=一般） */
    confirmColor?: 'primary' | 'error'
    /** 確認ボタンのローディング状態 */
    loading?: boolean
  }>(),
  {
    title: '確認',
    confirmLabel: '削除',
    cancelLabel: 'キャンセル',
    confirmColor: 'error',
    loading: false
  }
)

const emit = defineEmits<{
  /** 開閉状態の更新（v-model:open） */
  'update:open': [value: boolean]
  /** 確認ボタン押下時 */
  'confirm': []
  /** キャンセル時（キャンセルボタン押下またはモーダル外クリック） */
  'cancel': []
}>()

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v)
})

const onCancel = (): void => {
  emit('cancel')
  openModel.value = false
}

const onConfirm = (): void => {
  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="openModel"
    :title="title"
  >
    <template #body>
      <p class="text-sm">
        {{ message }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          :disabled="loading"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </UButton>
        <UButton
          :color="confirmColor"
          :loading="loading"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
