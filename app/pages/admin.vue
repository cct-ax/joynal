<script setup lang="ts">
/**
 * 管理画面（管理者専用）。
 *
 * - UTabs で「ユーザー管理」「メンター割り当て」を切り替える。
 * - ユーザー管理: useAdminUsers ＋ UserTable ＋ UserAddModal / UserEditModal。
 * - メンター割り当て: useMentorAssignments ＋ AssignmentRow（行）＋ 保存ボタン。
 * - 配線に徹し、取得・編集ロジックは composable に委譲する。
 * - admin 以外のアクセスは auth.global.ts のロールガードでリダイレクト済み。
 *
 * design プロト joynal-admin-pc.html（AdminScreen）を Vue 化したもの。
 */
import type { TabsItem } from '@nuxt/ui'
import type { Profile } from '#shared/types/models'

const tabs: TabsItem[] = [
  { label: 'ユーザー管理', value: 'users', slot: 'users' },
  { label: '新人担当設定', value: 'assign', slot: 'assign' }
]
const activeTab = ref('users')

// --- ユーザー管理 ---
const { users, pending: usersPending, refresh: refreshUsers, setActive } = useAdminUsers()

const addOpen = ref(false)
const editOpen = ref(false)
const editingUser = ref<Profile | null>(null)

const onEditUser = (user: Profile): void => {
  editingUser.value = user
  editOpen.value = true
}
const onSetActive = async (id: string, isActive: boolean): Promise<void> => {
  await setActive(id, isActive)
}

// --- メンター割り当て ---
const {
  rows,
  mentorOptions,
  ojtOptions,
  isDirty,
  pending: assignPending,
  setMentorId,
  setOjtId,
  save
} = useMentorAssignments()

// useAdminUsers / useMentorAssignments は server:false。SSR では idle（空）で描画され、
// クライアント初回描画では pending になるため分岐が server/client でずれてハイドレーション
// 不整合になる。report.vue と同じく mounted ゲートで初回は両者ともスケルトンを描画して回避する。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold tracking-tight">
      管理画面
    </h1>

    <UTabs
      v-model="activeTab"
      variant="link"
      :items="tabs"
      :unmount-on-hide="false"
      class="w-full"
    >
      <!-- ユーザー管理タブ -->
      <template #users>
        <div class="flex justify-end my-4">
          <UButton
            icon="i-lucide-plus"
            @click="addOpen = true"
          >
            ユーザーを追加
          </UButton>
        </div>
        <UserTable
          :users="users"
          :loading="!mounted || usersPending"
          @edit="onEditUser"
          @set-active="onSetActive"
        />
      </template>

      <!-- メンター割り当てタブ -->
      <template #assign>
        <div class="my-4 space-y-2">
          <!-- 列ヘッダー（PC のみ）。AssignmentRow と同じ列幅(flex-1 / w-44 / w-44)・px-4 gap-3 -->
          <div
            class="max-sm:hidden flex items-center gap-3 px-4 pb-2 border-b border-default text-xs font-semibold text-muted uppercase tracking-wider"
          >
            <div class="flex-1">
              新人
            </div>
            <div class="w-44 shrink-0">
              メンター
            </div>
            <div class="w-44 shrink-0">
              OJT
            </div>
          </div>

          <div
            v-if="!mounted || assignPending"
            class="space-y-2 py-2"
          >
            <USkeleton
              v-for="i in 3"
              :key="i"
              class="h-10 w-full"
            />
          </div>

          <EmptyState
            v-else-if="rows.length === 0"
            emoji="👥"
            message="割り当て対象の新人がいません"
          />

          <template v-else>
            <AssignmentRow
              v-for="row in rows"
              :key="row.traineeId"
              :trainee-name="row.traineeName"
              :mentor-options="mentorOptions"
              :ojt-options="ojtOptions"
              :mentor-id="row.mentorId"
              :ojt-id="row.ojtId"
              @update:mentor-id="(value) => setMentorId(row.traineeId, value ?? null)"
              @update:ojt-id="(value) => setOjtId(row.traineeId, value ?? null)"
            />
            <div class="flex justify-end pt-2">
              <UButton
                :loading="assignPending"
                :disabled="!isDirty"
                @click="save"
              >
                保存
              </UButton>
            </div>
          </template>
        </div>
      </template>
    </UTabs>

    <UserAddModal
      v-model:open="addOpen"
      @saved="refreshUsers"
    />
    <UserEditModal
      v-model:open="editOpen"
      :user="editingUser"
      @saved="refreshUsers"
    />
  </div>
</template>
