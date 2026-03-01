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

  const childId = event.context.params?.childId
  if (!childId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing childId' })
  }
  ensureUuid(childId, 'childId')

  await $fetch(
    `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children/${childId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  return { ok: true }
})
