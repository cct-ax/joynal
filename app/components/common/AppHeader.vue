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
// 初回オープン時にチャンクを取得し、以後はマウントを維持して開閉トランジションを保つ。
const pwModalMounted = useLazyOpen(pwModalOpen)

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
    :toggle="false"
    :ui="{ container: 'max-w-5xl' }"
  >
    <!-- 左: ロゴ＋（admin のみ）日報 / 管理ナビをロゴの右隣に並べる -->
    <template #left>
      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          to="/report"
          class="text-lg font-bold tracking-tight select-none"
        >
          Joynal
        </NuxtLink>
        <!-- admin のみ: 日報 / 管理の水平ナビ。highlight で active を primary 下線表示 -->
        <UNavigationMenu
          v-if="user && isAdmin"
          :items="adminNavItems"
          variant="link"
          highlight
          aria-label="管理者ナビゲーション"
        />
      </div>
    </template>

    <template #right>
      <div
        v-if="user"
        class="flex items-center gap-1"
      >
        <slot name="nav" />
        <!-- /api/users/me 取得中は名前が確定しないため、フォールバック文言を出さず Skeleton を表示する。
             スマホでは氏名を隠してアイコンのみにする（左ナビのスペース確保）。 -->
        <USkeleton
          v-if="pending"
          class="h-7 w-28 rounded-full max-sm:hidden"
        />
        <!-- 氏名のみ（アバターなし） -->
        <UUser
          v-else
          :name="profile?.name ?? 'ユーザー'"
          :ui="{ name: 'text-sm font-medium' }"
          class="max-sm:hidden"
        />
        <UColorModeButton />
        <UDropdownMenu
          :items="userMenuItems"
          :ui="{ content: 'min-w-44' }"
        >
          <UButton
            icon="i-lucide-ellipsis"
            variant="ghost"
            color="neutral"
            :aria-label="`${profile?.name ?? 'ユーザー'} メニュー`"
          />
        </UDropdownMenu>
      </div>
    </template>
  </UHeader>

  <LazyPasswordChangeModal
    v-if="pwModalMounted"
    v-model:open="pwModalOpen"
  />
</template>
