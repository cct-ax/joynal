import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  const { weekStart, traineeId } = query as { weekStart?: string, traineeId?: string }

  if (!weekStart || !traineeId) {
    throw createError({ statusCode: 400, message: 'weekStart と traineeId は必須です' })
  }

  const { data, error } = await client
    .from('comments')
    .select(`
      id,
      week_start,
      trainee_id,
      commenter_id,
      content,
      created_at,
      updated_at,
      commenter:profiles!commenter_id(name, role)
    `)
    .eq('week_start', weekStart)
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
