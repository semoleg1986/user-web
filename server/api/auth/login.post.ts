import { getHeader, getRequestIP } from 'h3'
import { setAccessToken, setRefreshToken } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event)
  const identifier = readRequiredStringField(rawBody, 'identifier', { minLength: 3, maxLength: 255 })
  const password = readRequiredStringField(rawBody, 'password', { minLength: 6, maxLength: 255 })
  const config = useRuntimeConfig()
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  const fallbackIp = getRequestIP(event, { xForwardedFor: true }) || undefined
  const userAgent = getHeader(event, 'user-agent')
  const headers: Record<string, string> = {}
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor
  if (realIp || fallbackIp) headers['x-real-ip'] = realIp || fallbackIp!
  if (!forwardedFor && fallbackIp) headers['x-forwarded-for'] = fallbackIp
  if (userAgent) headers['user-agent'] = userAgent

  try {
    const res = await $fetch<{ user_id: string, tokens: { access_token: string, refresh_token: string } }>(
      `${config.authServiceUrl}/v1/auth/login`,
      {
        method: 'POST',
        body: { identifier, password },
        headers
      }
    )

    setAccessToken(event, res.tokens.access_token, config.cookieSecure, config.cookieSameSite)
    setRefreshToken(event, res.tokens.refresh_token, config.cookieSecure, config.cookieSameSite)

    return { user_id: res.user_id }
  } catch (err: unknown) {
    const statusCode
      = typeof err === 'object'
        && err !== null
        && 'statusCode' in err
        && typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500

    if (statusCode === 401 || statusCode === 403) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }
    if (statusCode === 429) {
      throw createError({ statusCode: 429, statusMessage: 'Too many login attempts' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Auth upstream is unavailable' })
  }
})
