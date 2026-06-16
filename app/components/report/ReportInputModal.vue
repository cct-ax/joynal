<script setup lang="ts">
import type { Time } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import { isMoodValue, type MoodValue } from '#shared/types/api'
import type { DailyReport } from '#shared/types/models'
import { reportSchema, type ReportSchema } from '#shared/types/schemas'

const FORM_ID = 'report-input-form'

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{
  date: string | null
  report?: DailyReport | null
}>(), {
  report: null
})

const form = useTemplateRef('form')
const state = reactive<Partial<ReportSchema>>({
  date: '',
  check_in: '',
  check_out: '',
  content: '',
  mood: undefined
})

const title = computed(() => props.report ? '日報を編集' : '日報を入力')

const syncState = (): void => {
  state.date = props.report?.date ?? props.date ?? ''
  state.check_in = toHm(props.report?.check_in)
  state.check_out = toHm(props.report?.check_out)
  state.content = props.report?.content ?? ''
  state.mood = isMoodValue(props.report?.mood) ? props.report.mood : undefined
  form.value?.clear()
}

const checkInValue = computed<Time | null>({
  get: () => toTimeValue(state.check_in),
  set: (value) => {
    state.check_in = fromTimeValue(value)
  }
})

const checkOutValue = computed<Time | null>({
  get: () => toTimeValue(state.check_out),
  set: (value) => {
    state.check_out = fromTimeValue(value)
  }
})

const moodValue = computed<MoodValue | null>({
  get: () => isMoodValue(state.mood) ? state.mood : null,
  set: (value) => {
    state.mood = value ?? undefined
  }
})

const submit = async (data: ReportSchema): Promise<void> => {
  await Promise.resolve(data)
}

const onSubmit = (event: FormSubmitEvent<ReportSchema>): Promise<void> =>
  submit(event.data)

watch(open, (isOpen): void => {
  if (isOpen) {
    syncState()
  }
}, { immediate: true })

watch([() => props.date, () => props.report], (): void => {
  if (open.value) {
    syncState()
  }
})

defineExpose({ submit })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    class="w-full max-w-lg"
    :ui="{
      header: 'px-5 py-3.5',
      title: 'text-base',
      body: 'p-5',
      footer: 'justify-end px-5 py-4',
      close: 'cursor-pointer'
    }"
  >
    <template #body>
      <UForm
        :id="FORM_ID"
        ref="form"
        :schema="reportSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="日付"
          name="date"
          required
        >
          <UInput
            id="report-date"
            :model-value="state.date ?? ''"
            icon="i-lucide-calendar-days"
            readonly
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="出勤"
            name="check_in"
            required
          >
            <UInputTime
              id="report-check-in"
              v-model="checkInValue"
              icon="i-lucide-clock"
              granularity="minute"
              :hour-cycle="24"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </UFormField>

          <UFormField
            label="退勤"
            name="check_out"
            required
          >
            <UInputTime
              id="report-check-out"
              v-model="checkOutValue"
              icon="i-lucide-clock"
              granularity="minute"
              :hour-cycle="24"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </UFormField>
        </div>

        <UFormField
          label="やったこと"
          name="content"
          required
        >
          <UTextarea
            id="report-content"
            v-model="state.content"
            :rows="7"
            :maxrows="12"
            autoresize
            placeholder="Joy / Good / Next"
            class="w-full"
            :ui="{ base: 'w-full resize-none' }"
          />
        </UFormField>

        <UFormField
          label="気分"
          name="mood"
          hint="任意"
        >
          <MoodStars v-model="moodValue" />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        class="cursor-pointer"
        @click="close"
      >
        キャンセル
      </UButton>
      <UButton
        type="submit"
        :form="FORM_ID"
        icon="i-lucide-save"
        class="cursor-pointer"
      >
        保存
      </UButton>
    </template>
  </UModal>
</template>
