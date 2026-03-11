import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import {
  ensureUuid,
  readOptionalStringField,
  readRequiredDateField
} from '~~/server/utils/validation'

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

  const name = readOptionalStringField(rawBody, 'name', { minLength: 1, maxLength: 120 })
  let birthdate: string | undefined
  if (typeof rawBody === 'object' && rawBody !== null && 'birthdate' in (rawBody as Record<string, unknown>)) {
    birthdate = readRequiredDateField(rawBody, 'birthdate')
  }
  if (!name && !birthdate) {
    throw createError({ statusCode: 422, statusMessage: "At least one field is required: 'name' or 'birthdate'" })
  }

  return await fetchWithAuthRetry(
    event,
    `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children/${childId}`,
    {
      method: 'PATCH',
      body: { name, birthdate },
    }
  )
})
