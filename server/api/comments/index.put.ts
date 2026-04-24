export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }

  const body = await readBody(event)
  const { weekStart, traineeId, content } = body ?? {}

  if (!weekStart || !traineeId || !content) {
    throw createError({ statusCode: 400, message: '必須項目が不足しています' })
  }

  const { data, error } = await client
    .from('weekly_comments')
    .upsert(
      { week_start: weekStart, trainee_id: traineeId, commenter_id: user.id, content },
      { onConflict: 'week_start,trainee_id,commenter_id' }
    )
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
