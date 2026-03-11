import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { readRequiredDateField, readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const rawBody = await readBody(event)
  const name = readRequiredStringField(rawBody, 'name', { minLength: 1, maxLength: 120 })
  const birthdate = readRequiredDateField(rawBody, 'birthdate')

  return await fetchWithAuthRetry(event, `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children`, {
    method: 'POST',
    body: { name, birthdate }
  })
})
