import { getAccessToken, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getAccessToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const attemptId = getRouterParam(event, 'attemptId')
  if (!attemptId) {
    throw createError({ statusCode: 422, statusMessage: 'attemptId is required' })
  }
  ensureUuid(attemptId, 'attemptId')

  return await $fetch(
    `${config.assessmentServiceUrl}/v1/user/attempts/${attemptId}/result`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
})
