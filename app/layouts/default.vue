<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const isAdmin = ref(false)

const onUserChange = async (currentUser: ReturnType<typeof useSupabaseUser>['value']) => {
  if (!currentUser?.id) {
    isAdmin.value = false
    return
  }
  const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
  isAdmin.value = data?.role === 'admin'
}

watch(user, onUserChange, { immediate: true })

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
