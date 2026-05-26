<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const passwordModalOpen = ref(false)

const { profile, isAdmin } = useCurrentUser()

const displayName = computed(() => profile.value?.name ?? 'ユーザー')

const openPasswordModal = () => {
  passwordModalOpen.value = true
}

const closePasswordModal = () => {
  passwordModalOpen.value = false
}

const signOut = async () => {
  await supabase.auth.signOut()
  await router.push('/login')
}

const userMenuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = []

  if (isAdmin.value) {
    items.push(
      {
        label: '管理',
        icon: 'i-lucide-settings',
        to: '/admin',
        class: 'sm:hidden'
      },
      {
        type: 'separator',
        class: 'sm:hidden'
      }
    )
  }

  items.push(
    {
      label: 'パスワード変更',
      icon: 'i-lucide-lock',
      onSelect: openPasswordModal
    },
    {
      type: 'separator'
    },
    {
      label: 'ログアウト',
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: () => {
        void signOut()
      }
    }
  )

  return items
})
</script>

<template>
  <div class="min-h-screen bg-[#f9fafb] text-[#111827]">
    <header
      class="sticky top-0 z-50 flex h-[52px] items-center justify-between gap-4 border-b border-[#e5e7eb] bg-white px-4 sm:px-5"
    >
      <div class="flex min-w-0 items-center gap-5">
        <NuxtLink
          to="/report"
          class="shrink-0 cursor-pointer select-none text-[18px] font-bold leading-none tracking-normal text-[#111827]"
        >
          Joynal
        </NuxtLink>

        <nav
          v-if="user && isAdmin"
          class="hidden items-center gap-1 sm:flex"
          aria-label="メインナビゲーション"
        >
          <NuxtLink
            to="/admin"
            class="rounded-md px-3 py-1.5 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            active-class="bg-[#eef2ff] text-[#4f46e5]"
          >
            管理
          </NuxtLink>
        </nav>
      </div>

      <div
        v-if="user"
        class="shrink-0"
      >
        <div class="flex items-center gap-2">
          <span class="max-w-[11rem] truncate text-sm text-[#6b7280]">
            {{ displayName }}
          </span>
          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'end', sideOffset: 4 }"
            :ui="{
              content: 'w-[168px] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg',
              item: 'cursor-pointer'
            }"
          >
            <UButton
              type="button"
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="outline"
              size="sm"
              square
              class="h-8 w-9 cursor-pointer justify-center !border-[#e5e7eb] !bg-white !px-0 !text-[#6b7280] hover:!bg-[#f3f4f6] focus:!ring-4 focus:!ring-[#c7d2fe]"
              aria-label="メニューを開く"
              aria-haspopup="menu"
            />
          </UDropdownMenu>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <PasswordChangeModal
      v-if="passwordModalOpen"
      @close="closePasswordModal"
    />
  </div>
</template>
