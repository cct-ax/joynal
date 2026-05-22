<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const passwordModalOpen = ref(false)

const { profile, isAdmin } = useCurrentUser()

const displayName = computed(() => profile.value?.name ?? 'ユーザー')

const closeMenu = () => {
  menuOpen.value = false
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const openPasswordModal = () => {
  closeMenu()
  passwordModalOpen.value = true
}

const closePasswordModal = () => {
  passwordModalOpen.value = false
}

onClickOutside(menuRef, closeMenu)

const signOut = async () => {
  closeMenu()
  await supabase.auth.signOut()
  await router.push('/login')
}
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
        ref="menuRef"
        class="relative shrink-0"
      >
        <div class="flex items-center gap-2">
          <span class="max-w-[11rem] truncate text-sm text-[#6b7280]">
            {{ displayName }}
          </span>
          <button
            type="button"
            class="inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-lg leading-none text-[#6b7280] transition hover:bg-[#f3f4f6] focus:outline-none focus:ring-4 focus:ring-[#c7d2fe]"
            aria-label="メニューを開く"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            @click="toggleMenu"
          >
            <UIcon
              name="i-lucide-ellipsis"
              class="size-4"
            />
          </button>
        </div>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-[calc(100%+4px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg"
          role="menu"
        >
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            class="block cursor-pointer px-4 py-2.5 text-left text-sm text-[#111827] transition hover:bg-[#f3f4f6] sm:hidden"
            role="menuitem"
            @click="closeMenu"
          >
            管理
          </NuxtLink>
          <div
            v-if="isAdmin"
            class="h-px bg-[#e5e7eb] sm:hidden"
          />
          <button
            type="button"
            class="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-[#111827] transition hover:bg-[#f3f4f6]"
            role="menuitem"
            @click="openPasswordModal"
          >
            <UIcon
              name="i-lucide-lock"
              class="size-4"
            />
            パスワード変更
          </button>
          <div class="h-px bg-[#e5e7eb]" />
          <button
            type="button"
            class="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-[#dc2626] transition hover:bg-[#fef2f2]"
            role="menuitem"
            @click="signOut"
          >
            ログアウト
          </button>
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
