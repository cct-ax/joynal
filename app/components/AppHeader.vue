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
        <slot name="nav" />
        <UUser :name="profile?.name ?? 'ユーザー'" />
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
