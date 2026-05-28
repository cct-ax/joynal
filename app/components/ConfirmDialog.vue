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
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: 'primary' | 'error'
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
  'update:open': [value: boolean]
  'confirm': []
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
