import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const childId = event.context.params?.childId
  if (!childId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing childId' })
  }
  ensureUuid(childId, 'childId')

  return await fetchWithAuthRetry(
    event,
    `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children/${childId}/restore`,
    {
      method: 'POST'
    }
  )
})
