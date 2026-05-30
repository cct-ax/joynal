<script setup lang="ts">
/**
 * 全ページ共通のヘッダー。
 *
 * - 左: 「Joynal」ロゴ（/report リンク。UHeader の title/to に委譲）
 * - 右: nav slot（MS4 で admin タブ等を追加予定）+ ユーザードロップダウン（パスワード変更 / ログアウト）
 * - sticky・border・高さ（--ui-header-height）・コンテナは UHeader 既定に委譲する。
 *
 * design プロト L357-410（Header）を Vue 化したもの。
 * スマホ時はユーザー名を隠してアイコンのみ表示する（Tailwind の `sm:` で切替）。
 */
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const { profile, pending, isAdmin } = useCurrentUser()
const route = useRoute()

// admin 専用ナビ。/report と /admin の 2 項目、現在のルートを active にする。
const adminNavItems = computed<NavigationMenuItem[]>(() => [
  { label: '日報', to: '/report', active: route.path === '/report' },
  { label: '管理', to: '/admin', active: route.path.startsWith('/admin') }
])

const pwModalOpen = ref(false)

const signOut = async (): Promise<void> => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    // サーバーが cookie を破棄するため、フルリロード（external）でクライアント側の
    // セッションも確実にクリアしてから /login へ遷移する。
    await navigateTo('/login', { external: true })
  }
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
  <UHeader
    title="Joynal"
    to="/report"
    :toggle="false"
    :ui="{ container: 'max-w-5xl', title: 'text-lg tracking-tight select-none' }"
  >
    <!-- MS4: ナビ項目が増えたら中央(#default)スロット + :toggle でモバイルメニュー化 -->
    <template #right>
      <div
        v-if="user"
        class="flex items-center gap-1.5"
      >
        <!-- admin のみ: 日報 / 管理の水平ナビ -->
        <UNavigationMenu
          v-if="isAdmin"
          :items="adminNavItems"
          color="neutral"
          variant="link"
          :highlight="false"
          aria-label="管理者ナビゲーション"
        />
        <slot name="nav" />
        <!-- /api/users/me 取得中は名前が確定しないため、フォールバック文言を出さず Skeleton を表示する -->
        <USkeleton
          v-if="pending"
          class="h-4 w-24"
        />
        <UUser
          v-else
          :name="profile?.name ?? 'ユーザー'"
        />
        <UColorModeButton />
        <UDropdownMenu :items="userMenuItems">
          <UButton
            icon="i-lucide-menu"
            variant="ghost"
            color="neutral"
            :aria-label="`${profile?.name ?? 'ユーザー'} メニュー`"
          />
        </UDropdownMenu>
      </div>
    </template>
  </UHeader>

  <PasswordChangeModal v-model:open="pwModalOpen" />
</template>
