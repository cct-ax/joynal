export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin') return

  const user = useSupabaseUser()
  if (!user.value) return

  const supabase = useSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .single()

  if (data?.role !== 'admin') {
    return navigateTo('/report')
  }
})
