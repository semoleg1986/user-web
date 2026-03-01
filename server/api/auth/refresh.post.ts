import { getRefreshToken, setAccessToken } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const refresh = getRefreshToken(event)
  if (!refresh) {
    throw createError({ statusCode: 401, statusMessage: 'No refresh token' })
  }
  readRequiredStringField({ refresh_token: refresh }, 'refresh_token', { minLength: 20, maxLength: 4096 })

  const res = await $fetch<{ access_token: string }>(`${config.authServiceUrl}/v1/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: refresh },
  })

  setAccessToken(event, res.access_token, config.cookieSecure, config.cookieSameSite)
  return { ok: true }
})
