<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const apiError = useApiError()
const passwordModalOpen = ref(false)

const { profile, isAdmin } = useCurrentUser()

const displayName = computed(() => profile.value?.name ?? 'ユーザー')

const openPasswordModal = () => {
  passwordModalOpen.value = true
}

const signOut = async (): Promise<void> => {
  try {
    // サーバー側でセッション Cookie を破棄する（フロントから Supabase を直接呼ばない）。
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch (error: unknown) {
    apiError.notify(error, { fallback: 'ログアウトに失敗しました' })
    return
  }
  // フルリロード（external）でクライアントの認証状態も確実にクリアしてから /login へ。
  await navigateTo('/login', { external: true })
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
  <div class="min-h-screen bg-muted text-default">
    <header
      class="sticky top-0 z-50 flex h-[52px] items-center justify-between gap-4 border-b border-default bg-default px-4 sm:px-5"
    >
      <div class="flex min-w-0 items-center gap-5">
        <NuxtLink
          to="/report"
          class="shrink-0 cursor-pointer select-none text-[18px] font-bold leading-none tracking-normal text-highlighted"
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
            class="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-elevated hover:text-highlighted"
            active-class="bg-primary/10 text-primary"
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
          <span class="max-w-44 truncate text-sm text-muted">
            {{ displayName }}
          </span>
          <UColorModeButton
            color="neutral"
            variant="ghost"
            size="sm"
            square
            class="cursor-pointer"
          />
          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'end', sideOffset: 4 }"
            :ui="{
              content: 'w-[168px]',
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
              class="h-8 w-9 cursor-pointer justify-center"
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

    <PasswordChangeModal v-model:open="passwordModalOpen" />
  </div>
</template>
