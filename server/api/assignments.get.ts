import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid, readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const childId = readRequiredStringField(getQuery(event), 'childId')
  ensureUuid(childId, 'childId')

  return await fetchWithAuthRetry(
    event,
    `${config.assessmentServiceUrl}/v1/user/children/${childId}/assignments`,
    {
      method: 'GET'
    }
  )
})
