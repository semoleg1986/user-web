import { setAccessToken, setRefreshToken } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event)
  const identifier = readRequiredStringField(rawBody, 'identifier', { minLength: 3, maxLength: 255 })
  const password = readRequiredStringField(rawBody, 'password', { minLength: 6, maxLength: 255 })
  const config = useRuntimeConfig()

  const res = await $fetch<{ user_id: string, tokens: { access_token: string, refresh_token: string } }>(
      `${config.authServiceUrl}/v1/auth/login`,
      {
        method: 'POST',
        body: { identifier, password }
    }
  )

  setAccessToken(event, res.tokens.access_token, config.cookieSecure, config.cookieSameSite)
  setRefreshToken(event, res.tokens.refresh_token, config.cookieSecure, config.cookieSameSite)

  return { user_id: res.user_id }
})
