export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('profiles')
    .select('id, employee_id, name, email, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
