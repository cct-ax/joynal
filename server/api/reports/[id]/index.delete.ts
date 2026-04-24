export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')

  const { error } = await client.from('reports').delete().eq('id', id!)

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({ statusCode: 404, message: '日報が見つかりません' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  setResponseStatus(event, 204)
  return null
})
