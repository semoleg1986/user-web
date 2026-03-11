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
  const assignmentId = readRequiredStringField(rawBody, 'assignment_id')
  const childId = readRequiredStringField(rawBody, 'child_id')
  ensureUuid(assignmentId, 'assignment_id')
  ensureUuid(childId, 'child_id')

  return await fetchWithAuthRetry(
    event,
    `${config.assessmentServiceUrl}/v1/user/assignments/${assignmentId}/start`,
    {
      method: 'POST',
      body: { child_id: childId }
    }
  )
})
