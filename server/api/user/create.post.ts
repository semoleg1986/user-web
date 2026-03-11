import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const rawBody = await readBody(event)
  const name = readRequiredStringField(rawBody, 'name', { minLength: 1, maxLength: 120 })

  try {
    const res = await fetchWithAuthRetry(event, `${config.userChildrenServiceUrl}/v1/user/users`, {
      method: 'POST',
      body: { name },
    })
    return res
  } catch (err: unknown) {
    const statusCode =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined
    if (statusCode === 409) {
      return { ok: true, alreadyExists: true }
    }
    throw err
  }
})
