import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid, readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const rawBody = await readBody(event)
  const childId = event.context.params?.childId
  if (!childId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing childId' })
  }
  ensureUuid(childId, 'childId')
  const title = readRequiredStringField(rawBody, 'title', { minLength: 1, maxLength: 200 })
  const content = readRequiredStringField(rawBody, 'content', { minLength: 1, maxLength: 10000 })

  return await fetchWithAuthRetry(
    event,
    `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children/${childId}/stories`,
    {
      method: 'POST',
      body: { title, content }
    }
  )
})
