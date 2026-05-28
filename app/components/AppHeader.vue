<script setup lang="ts">
/**
 * 全ページ共通のヘッダー。
 *
 * - 左: 「Joynal」ロゴ（/report リンク）
 * - 中央: nav slot（layouts 側で追加リンクを差し込み可能、MS4 で admin タブ等を追加予定）
 * - 右: ユーザー名 + ⋯ → UDropdownMenu（パスワード変更 / ログアウト）
 *
 * design プロト L357-410（Header）を Vue 化したもの。
 * スマホ時はユーザー名を隠してアイコンのみ表示する（Tailwind の `sm:` で切替）。
 */
import type { DropdownMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const { profile } = useCurrentUser()

const pwModalOpen = ref(false)

const signOut = async (): Promise<void> => {
  await supabase.auth.signOut()
  await router.push('/login')
}

// UDropdownMenu の items は2次元配列。各内側配列が区切り線で分離される
const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'パスワード変更',
      icon: 'i-lucide-key',
      onSelect: () => {
        pwModalOpen.value = true
      }
    }
  ],
  [
    {
      label: 'ログアウト',
      icon: 'i-lucide-log-out',
      onSelect: signOut
    }
  ]
])
</script>

<template>
  <header
    class="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800"
  >
    <div class="max-w-5xl mx-auto flex items-center justify-between h-13 px-4 gap-4">
      <NuxtLink
        to="/report"
        class="text-lg font-bold tracking-tight select-none"
      >
        Joynal
      </NuxtLink>

      <div
        v-if="user"
        class="flex items-center gap-2"
      >
        <slot name="nav" />
        <UDropdownMenu :items="userMenuItems">
          <UButton
            variant="ghost"
            color="neutral"
            trailing-icon="i-lucide-chevron-down"
            :aria-label="`${profile?.name ?? 'ユーザー'} メニュー`"
          >
            <span class="hidden sm:inline">{{ profile?.name ?? 'ユーザー' }}</span>
            <UIcon
              name="i-lucide-user"
              class="sm:hidden"
            />
          </UButton>
        </UDropdownMenu>
      </div>
    </div>
  </header>

  <PasswordChangeModal v-model:open="pwModalOpen" />
</template>
