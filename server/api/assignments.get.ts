import { getAccessToken, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid, readRequiredStringField } from '~~/server/utils/validation'

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

  const childId = readRequiredStringField(getQuery(event), 'childId')
  ensureUuid(childId, 'childId')

  return await $fetch(
    `${config.assessmentServiceUrl}/v1/user/children/${childId}/assignments`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
})
