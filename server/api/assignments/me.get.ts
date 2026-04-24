export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const query = getQuery(event)
  const year = query.year ? Number(query.year) : new Date().getFullYear()

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: profileError.message })
  }

  if (profile.role === 'trainee') {
    throw createError({ statusCode: 403, message: 'アクセス権限がありません' })
  }

  if (profile.role === 'admin') {
    const { data, error } = await client
      .from('assignments')
      .select(`
        trainee_id,
        mentor_id,
        ojt_id,
        year,
        trainee:profiles!trainee_id(name),
        mentor:profiles!mentor_id(name),
        ojt:profiles!ojt_id(name)
      `)
      .eq('year', year)

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return data
  }

  const { data, error } = await client
    .from('assignments')
    .select('trainee_id, year, trainee:profiles!trainee_id(name, employee_id)')
    .or(`mentor_id.eq.${user.id},ojt_id.eq.${user.id}`)
    .eq('year', year)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
