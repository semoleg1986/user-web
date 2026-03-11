import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const attemptId = getRouterParam(event, 'attemptId')
  if (!attemptId) {
    throw createError({ statusCode: 422, statusMessage: 'attemptId is required' })
  }
  ensureUuid(attemptId, 'attemptId')

  return await fetchWithAuthRetry(
    event,
    `${config.assessmentServiceUrl}/v1/user/attempts/${attemptId}/result`,
    {
      method: 'GET'
    }
  )
})
