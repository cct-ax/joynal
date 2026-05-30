<script setup lang="ts">
/**
 * 日報入力・編集モーダル（新人ロール専用）。
 *
 * - `report` が null なら新規入力、null 以外なら編集モード。
 * - 削除確認は ConfirmDialog に委譲する。
 * - 409（同日重複）と 400（バリデーション）はサーバーメッセージを優先表示。
 * - スマホでは全画面モーダル化（`:ui` で実現）。
 *
 * design プロト L534-597（ReportModal）を Vue 化したもの。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Time } from '@internationalized/date'
import type { DailyReport } from '#shared/types/models'
import { isMoodValue, type MoodValue, type ReportCreateBody, type ReportUpdateBody } from '#shared/types/api'
import { reportSchema, type ReportSchema } from '#shared/types/schemas'

const props = defineProps<{
  open: boolean
  date: string | null
  report: DailyReport | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
  'deleted': []
}>()

const toast = useToast()
const apiError = useApiError()
const loading = ref(false)
const deleteLoading = ref(false)
const confirmDeleteOpen = ref(false)

const isEdit = computed(() => props.report !== null)
const title = computed(() => (isEdit.value ? '日報を編集' : '日報を入力'))

const state = reactive<Partial<ReportSchema>>({
  date: '',
  check_in: '',
  check_out: '',
  content: '',
  mood: undefined
})

/** DB の mood (number | null) を MoodValue | undefined に絞り込む */
const toMoodValue = (m: unknown): MoodValue | undefined =>
  isMoodValue(m) ? m : undefined

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v)
})

// UInputTime は @internationalized/date の Time を扱うため、文字列の state と
// computed プロキシで橋渡しする（state・スキーマ・API ボディは "HH:MM" 文字列のまま）。
const checkInTime = computed<Time | null>({
  get: () => toTimeValue(state.check_in),
  set: (t) => {
    state.check_in = t ? fromTimeValue(t) : ''
  }
})
const checkOutTime = computed<Time | null>({
  get: () => toTimeValue(state.check_out),
  set: (t) => {
    state.check_out = t ? fromTimeValue(t) : ''
  }
})

// モーダルが開くたびに state を初期化。編集時は report の値、新規時は date のみ。
// immediate: true で初回マウント時にも反映させる。
watch(
  () => props.open,
  (opened) => {
    if (!opened) return
    state.date = props.report?.date ?? props.date ?? ''
    // DB の time 由来 "HH:MM:SS" を正準 "HH:MM" に正規化してから格納する。
    state.check_in = fromTimeValue(toTimeValue(props.report?.check_in))
    state.check_out = fromTimeValue(toTimeValue(props.report?.check_out))
    state.content = props.report?.content ?? ''
    state.mood = toMoodValue(props.report?.mood)
  },
  { immediate: true }
)

const dateLabel = computed(() => {
  if (!state.date) return ''
  const d = parseYmd(state.date)
  if (!d) return state.date
  return formatDateWithWeekday(d)
})

const close = (): void => {
  openModel.value = false
}

// 送信処理本体。UForm @submit から呼ぶほか、テストでは defineExpose 経由で直接呼ぶ。
const submit = async (data: ReportSchema): Promise<void> => {
  loading.value = true
  try {
    if (isEdit.value && props.report) {
      // MoodValue 統一の効果: data.mood は MoodValue | undefined なので
      // null 合体だけで ReportUpdateBody.mood (MoodValue | null) と一致する
      const body: ReportUpdateBody = {
        check_in: data.check_in,
        check_out: data.check_out,
        content: data.content,
        mood: data.mood ?? null
      }
      await $fetch(`/api/reports/${props.report.id}`, { method: 'PUT', body })
      toast.add({ title: '日報を更新しました', color: 'success' })
    } else {
      const body: ReportCreateBody = {
        date: data.date,
        check_in: data.check_in,
        check_out: data.check_out,
        content: data.content,
        // mood が undefined の場合のみキーを省略（POST の任意項目）
        ...(data.mood !== undefined ? { mood: data.mood } : {})
      }
      await $fetch('/api/reports', { method: 'POST', body })
      toast.add({ title: '日報を保存しました', color: 'success' })
    }
    emit('saved')
    close()
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 409: '同じ日付の日報がすでに存在します' },
      fallback: '保存に失敗しました'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = (event: FormSubmitEvent<ReportSchema>): Promise<void> => submit(event.data)

const onDelete = async (): Promise<void> => {
  if (!props.report) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/reports/${props.report.id}`, { method: 'DELETE' })
    toast.add({ title: '日報を削除しました', color: 'success' })
    confirmDeleteOpen.value = false
    emit('deleted')
    close()
  } catch (error: unknown) {
    apiError.notify(error, { fallback: '削除に失敗しました' })
  } finally {
    deleteLoading.value = false
  }
}

// MoodStars は MoodValue | null を emit するが、state.mood の型は MoodValue | undefined。
// null → undefined に変換する setter を使う（state は Partial<ReportSchema> 上で undefined を使う）。
const onMoodUpdate = (v: ReportSchema['mood'] | null): void => {
  state.mood = v ?? undefined
}

// テストで submit / onDelete を直接呼べるよう defineExpose する。
// UForm のスキーマ検証は別途スキーマテストでカバーするため、ロジック検証はこちらで行う。
defineExpose({ submit, onDelete })
</script>

<template>
  <UModal
    v-model:open="openModel"
    :title="title"
    :ui="{
      content: 'max-sm:w-screen! max-sm:h-dvh! max-sm:max-w-none! max-sm:rounded-none! sm:max-w-md'
    }"
  >
    <template #body>
      <UForm
        :schema="reportSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-sm">
          <span class="text-sm font-semibold">{{ dateLabel }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            name="check_in"
            label="出勤時間"
            required
          >
            <UInputTime
              v-model="checkInTime"
              :hour-cycle="24"
              class="w-full justify-center"
            />
          </UFormField>
          <UFormField
            name="check_out"
            label="退勤時間"
            required
          >
            <UInputTime
              v-model="checkOutTime"
              :hour-cycle="24"
              class="w-full justify-center"
            />
          </UFormField>
        </div>

        <UFormField
          name="content"
          label="やったこと"
          required
        >
          <UTextarea
            v-model="state.content"
            :rows="6"
            autoresize
            placeholder="本日の業務内容を記入してください"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="mood"
          label="気分（任意）"
          hint="クリックで選択、もう一度クリックで解除"
        >
          <MoodStars
            :model-value="state.mood"
            @update:model-value="onMoodUpdate"
          />
        </UFormField>

        <div class="flex items-center justify-between pt-2">
          <div>
            <UButton
              v-if="isEdit"
              color="error"
              variant="soft"
              size="sm"
              :disabled="loading"
              @click="confirmDeleteOpen = true"
            >
              削除
            </UButton>
          </div>
          <div class="flex gap-2">
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
              {{ isEdit ? '更新' : '保存' }}
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>

  <ConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="日報を削除"
    message="この日報を削除します。削除後は元に戻せません。よろしいですか？"
    :loading="deleteLoading"
    @confirm="onDelete"
  />
</template>
