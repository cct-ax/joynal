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
 *
 * FormExample.vue（写経用サンプル）のパターンを発展させた本実装。
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import type { DailyReport } from '#shared/types/models'
import type { ReportCreateBody, ReportUpdateBody } from '#shared/types/api'
import { reportSchema, type ReportSchema } from '~/types/schemas'

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
const loading = ref(false)
const deleteLoading = ref(false)
const confirmDeleteOpen = ref(false)

const isEdit = computed(() => props.report !== null)
const title = computed(() => (isEdit.value ? '日報を編集' : '日報を入力'))

const state = reactive<Partial<ReportSchema>>({
  date: undefined,
  check_in: undefined,
  check_out: undefined,
  content: undefined,
  mood: undefined
})

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v)
})

// モーダルが開くたびに state を初期化。編集時は report の値、新規時は date のみ。
// immediate: true で初回マウント時にも反映させる。
watch(
  () => props.open,
  (opened) => {
    if (!opened) return
    state.date = props.report?.date ?? props.date ?? undefined
    state.check_in = props.report?.check_in ?? undefined
    state.check_out = props.report?.check_out ?? undefined
    state.content = props.report?.content ?? undefined
    state.mood = props.report?.mood ?? undefined
  },
  { immediate: true }
)

const dateLabel = computed(() => {
  if (!state.date) return ''
  const d = parseYmd(state.date)
  if (!d) return state.date
  const labels = ['日', '月', '火', '水', '木', '金', '土']
  const dayLabel = labels[d.getDay()]
  return `${d.getFullYear()}/${formatMonthDay(d)}（${dayLabel}）`
})

const close = (): void => {
  openModel.value = false
}

const handleError = (error: unknown, fallback: string): void => {
  const status
    = typeof error === 'object' && error && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : 0
  const dataMessage
    = typeof error === 'object' && error && 'data' in error
      ? (error as { data: { message?: string } }).data?.message
      : undefined
  let message: string
  if (status === 409) {
    message = '同じ日付の日報がすでに存在します'
  } else if (status === 400 && dataMessage) {
    message = dataMessage
  } else {
    message = fallback
  }
  toast.add({ title: message, color: 'error' })
}

// 送信処理本体。UForm @submit から呼ぶほか、テストでは defineExpose 経由で直接呼ぶ。
const submit = async (data: ReportSchema): Promise<void> => {
  loading.value = true
  try {
    if (isEdit.value && props.report) {
      const body: ReportUpdateBody = {
        check_in: data.check_in,
        check_out: data.check_out,
        content: data.content,
        mood: (data.mood ?? null) as ReportUpdateBody['mood']
      }
      await $fetch(`/api/reports/${props.report.id}`, { method: 'PUT', body })
      toast.add({ title: '日報を更新しました', color: 'success' })
    } else {
      const moodValue = data.mood
      const body: ReportCreateBody = {
        date: data.date,
        check_in: data.check_in,
        check_out: data.check_out,
        content: data.content,
        ...(moodValue !== undefined && moodValue !== null
          ? { mood: moodValue as ReportCreateBody['mood'] }
          : {})
      }
      await $fetch('/api/reports', { method: 'POST', body })
      toast.add({ title: '日報を保存しました', color: 'success' })
    }
    emit('saved')
    close()
  } catch (error: unknown) {
    handleError(error, '保存に失敗しました')
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
    handleError(error, '削除に失敗しました')
  } finally {
    deleteLoading.value = false
  }
}

// MoodStars は null を emit するが、state.mood の型は number | undefined。
// null → undefined に変換する setter を使う。
const onMoodUpdate = (v: number | null): void => {
  state.mood = (v ?? undefined) as ReportSchema['mood']
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
            <UInput
              v-model="state.check_in"
              type="time"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="check_out"
            label="退勤時間"
            required
          >
            <UInput
              v-model="state.check_out"
              type="time"
              class="w-full"
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
