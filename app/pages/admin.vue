<script setup lang="ts">
/**
 * 管理画面（管理者専用）。
 *
 * - UTabs で「ユーザー管理」「新人担当設定」を切り替える。
 * - ユーザー管理: useAdminUsers ＋ UserTable ＋ UserFormModal（招待/編集兼用）。
 * - 新人担当設定: useMentorAssignments ＋ AssignmentRow（行）＋ dirty 保存バー。
 * - 配線に徹し、取得・編集ロジックは composable に委譲する。
 * - admin 以外のアクセスは auth.global.ts のロールガードでリダイレクト済み。
 *
 * design プロト joynal-admin-pc.html（AdminScreen）を Vue 化し、report.vue と同じ
 * カード基調（UCard + bg-muted カラムヘッダー）に揃えたもの。
 */
import type { TabsItem } from '@nuxt/ui'
import type { Profile } from '#shared/types/models'

const tabs: TabsItem[] = [
  { label: 'ユーザー管理', value: 'users', slot: 'users' },
  { label: '新人担当設定', value: 'assign', slot: 'assign' }
]
const activeTab = ref('users')

// --- ユーザー管理 ---
// 自分自身の行の無効化・権限変更を UI で抑止するため、ログイン中ユーザーの id を渡す
// （keyed 'current-user' なので AppHeader 等と取得を共有する）。
const { profile: currentUser } = useCurrentUser()
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

// --- 新人担当設定 ---
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

// ページヘッダーの at-a-glance サマリ（役割別カウント）。
// 担当未設定 = メンター未割り当ての新人数（>0 のとき warning 色で注意喚起）。
const statItems = computed(() => {
  const list = users.value ?? []
  const unassigned = rows.value.filter(r => r.mentorId == null).length
  return [
    { label: 'ユーザー', value: list.length, alert: false },
    { label: '新人', value: list.filter(u => u.role === 'trainee' && u.is_active).length, alert: false },
    { label: '担当未設定', value: unassigned, alert: unassigned > 0 }
  ]
})
</script>

<template>
  <div class="space-y-6">
    <!-- ページヘッダー -->
    <div class="space-y-3 animate-fade-up">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          管理画面
        </h1>
        <p class="text-sm text-muted">
          ユーザーの招待・編集と、新人へのメンター / OJT 割り当てを管理します。
        </p>
      </div>

      <!-- stat chips -->
      <div
        v-if="!mounted || usersPending"
        class="flex flex-wrap gap-2"
      >
        <USkeleton
          v-for="i in 3"
          :key="i"
          class="h-9 w-28 rounded-lg"
        />
      </div>
      <div
        v-else
        class="flex flex-wrap gap-2"
      >
        <div
          v-for="stat in statItems"
          :key="stat.label"
          class="flex items-baseline gap-1.5 rounded-lg bg-default ring ring-default px-3 py-1.5"
        >
          <span
            class="text-base font-semibold tabular-nums"
            :class="stat.alert ? 'text-warning' : 'text-highlighted'"
          >{{ stat.value }}</span>
          <span class="text-xs text-muted">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <UTabs
      v-model="activeTab"
      variant="link"
      :items="tabs"
      :unmount-on-hide="false"
      class="w-full animate-fade-up [animation-delay:80ms]"
    >
      <!-- ユーザー管理タブ -->
      <template #users>
        <UCard
          class="mt-4 animate-fade-up"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
            <h2 class="text-sm font-semibold text-highlighted">
              ユーザー一覧
            </h2>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              @click="addOpen = true"
            >
              ユーザーを追加
            </UButton>
          </div>
          <UserTable
            :users="users"
            :loading="!mounted || usersPending"
            :current-user-id="currentUser?.id"
            @edit="onEditUser"
            @set-active="onSetActive"
          />
        </UCard>
      </template>

      <!-- 新人担当設定タブ -->
      <template #assign>
        <UCard
          class="mt-4 animate-fade-up"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <div class="border-b border-default px-4 py-3">
            <h2 class="text-sm font-semibold text-highlighted">
              担当の割り当て
            </h2>
            <p class="text-xs text-muted mt-0.5">
              各新人にメンターと OJT を設定します。
            </p>
          </div>

          <!-- 列ヘッダー（PC のみ）。AssignmentRow と同じ列幅(flex-1 / w-44 / w-44) -->
          <div
            class="max-sm:hidden flex items-center gap-3 px-4 py-2 bg-muted border-b border-default text-xs font-semibold text-muted uppercase tracking-wider"
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
            class="space-y-2 p-4"
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

            <!-- dirty 保存バー（カードフッター） -->
            <div class="flex items-center justify-between gap-3 border-t border-default px-4 py-3">
              <span
                class="text-xs"
                :class="isDirty ? 'text-warning font-medium' : 'text-muted'"
              >
                {{ isDirty ? '未保存の変更があります' : 'すべて保存済み' }}
              </span>
              <UButton
                :loading="assignPending"
                :disabled="!isDirty"
                @click="save"
              >
                保存
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UTabs>

    <UserFormModal
      v-model:open="addOpen"
      @saved="refreshUsers"
    />
    <UserFormModal
      v-model:open="editOpen"
      :user="editingUser"
      :current-user-id="currentUser?.id"
      @saved="refreshUsers"
    />
  </div>
</template>
