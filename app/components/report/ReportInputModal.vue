<script setup lang="ts">
import type { Time } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import { isMoodValue, type MoodValue } from '#shared/types/api'
import type { DailyReport } from '#shared/types/models'
import { reportSchema, type ReportSchema } from '#shared/types/schemas'

const FORM_ID = 'report-input-form'
const TIME_OPTION_INTERVAL_MINUTES = 30

const padTimePart = (value: number): string => String(value).padStart(2, '0')
const TIME_OPTIONS = Array.from({ length: 24 * 60 / TIME_OPTION_INTERVAL_MINUTES }, (_, index) => {
  const totalMinutes = index * TIME_OPTION_INTERVAL_MINUTES
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${padTimePart(hour)}:${padTimePart(minute)}`
})

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{
  date: string | null
  report?: DailyReport | null
}>(), {
  report: null
})

const form = useTemplateRef('form')
const checkInPickerOpen = ref(false)
const checkOutPickerOpen = ref(false)
const state = reactive<Partial<ReportSchema>>({
  date: '',
  check_in: '',
  check_out: '',
  content: '',
  mood: undefined
})

const title = computed(() => props.report ? '日報を編集' : '日報を入力')

const displayDate = computed(() => {
  const date = parseYmd(state.date ?? '')
  return date ? formatDateWithWeekday(date) : ''
})

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

const selectCheckInTime = (time: string): void => {
  state.check_in = time
  checkInPickerOpen.value = false
}

const selectCheckOutTime = (time: string): void => {
  state.check_out = time
  checkOutPickerOpen.value = false
}

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
        <div class="space-y-1.5">
          <p class="text-sm font-medium text-highlighted">
            日付
          </p>
          <div
            class="flex min-h-9 w-full cursor-not-allowed select-none items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted ring ring-inset ring-muted"
          >
            <UIcon
              name="i-lucide-calendar-days"
              class="size-4 shrink-0 text-dimmed"
            />
            <span>{{ displayDate }}</span>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="出勤時間"
            name="check_in"
            required
          >
            <div class="flex w-full">
              <UInputTime
                id="report-check-in"
                v-model="checkInValue"
                granularity="minute"
                :hour-cycle="24"
                class="min-w-0 flex-1"
                :ui="{ base: 'w-full rounded-e-none' }"
              />
              <UPopover
                v-model:open="checkInPickerOpen"
                :content="{ align: 'end', side: 'bottom', sideOffset: 6, collisionPadding: 12 }"
              >
                <UButton
                  type="button"
                  icon="i-lucide-clock"
                  color="neutral"
                  variant="outline"
                  class="-ms-px shrink-0 cursor-pointer rounded-s-none"
                  aria-label="出勤時間を選択"
                />

                <template #content>
                  <div class="max-h-64 w-36 overflow-y-auto p-1">
                    <UButton
                      v-for="time in TIME_OPTIONS"
                      :key="`check-in-${time}`"
                      type="button"
                      color="neutral"
                      :variant="state.check_in === time ? 'soft' : 'ghost'"
                      block
                      class="cursor-pointer justify-center"
                      @click="selectCheckInTime(time)"
                    >
                      {{ time }}
                    </UButton>
                  </div>
                </template>
              </UPopover>
            </div>
          </UFormField>

          <UFormField
            label="退勤時間"
            name="check_out"
            required
          >
            <div class="flex w-full">
              <UInputTime
                id="report-check-out"
                v-model="checkOutValue"
                granularity="minute"
                :hour-cycle="24"
                class="min-w-0 flex-1"
                :ui="{ base: 'w-full rounded-e-none' }"
              />
              <UPopover
                v-model:open="checkOutPickerOpen"
                :content="{ align: 'end', side: 'bottom', sideOffset: 6, collisionPadding: 12 }"
              >
                <UButton
                  type="button"
                  icon="i-lucide-clock"
                  color="neutral"
                  variant="outline"
                  class="-ms-px shrink-0 cursor-pointer rounded-s-none"
                  aria-label="退勤時間を選択"
                />

                <template #content>
                  <div class="max-h-64 w-36 overflow-y-auto p-1">
                    <UButton
                      v-for="time in TIME_OPTIONS"
                      :key="`check-out-${time}`"
                      type="button"
                      color="neutral"
                      :variant="state.check_out === time ? 'soft' : 'ghost'"
                      block
                      class="cursor-pointer justify-center"
                      @click="selectCheckOutTime(time)"
                    >
                      {{ time }}
                    </UButton>
                  </div>
                </template>
              </UPopover>
            </div>
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
            placeholder="本日の業務内容を記入してください"
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
