import { refreshTokens } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const refresh = getCookie(event, 'refresh_token')
  if (!refresh) {
    throw createError({ statusCode: 401, statusMessage: 'No refresh token' })
  }
  readRequiredStringField({ refresh_token: refresh }, 'refresh_token', { minLength: 20, maxLength: 4096 })
  await refreshTokens(event)
  return { ok: true }
})
