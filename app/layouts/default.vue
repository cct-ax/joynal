<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const { isAdmin } = useCurrentUser()

const signOut = async () => {
  await supabase.auth.signOut()
  await router.push('/login')
}
</script>

<template>
  <div>
    <header>
      <span>Joynal</span>
      <nav v-if="user">
        <NuxtLink to="/report">日報</NuxtLink>
        <NuxtLink
          v-if="isAdmin"
          to="/admin"
        >
          管理
        </NuxtLink>
        <button @click="signOut">
          ログアウト
        </button>
      </nav>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
