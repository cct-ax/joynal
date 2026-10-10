<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

withDefaults(defineProps<{
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'error'
  loading?: boolean
}>(), {
  title: '確認',
  confirmLabel: '削除',
  cancelLabel: 'キャンセル',
  confirmColor: 'error',
  loading: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const onCancel = (): void => {
  emit('cancel')
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :dismissible="!loading"
    :close="{ disabled: loading }"
    class="w-full max-w-md"
    :ui="{
      header: 'px-5 py-3.5',
      title: 'text-base',
      body: 'p-5',
      footer: 'justify-end px-5 py-4',
      close: 'cursor-pointer'
    }"
  >
    <template #body>
      <p class="text-sm text-default">
        {{ message }}
      </p>
    </template>

    <template #footer>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        class="cursor-pointer"
        :disabled="loading"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </UButton>
      <UButton
        type="button"
        :color="confirmColor"
        class="cursor-pointer"
        :loading="loading"
        :disabled="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>
