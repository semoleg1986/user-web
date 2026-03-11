import { createError, getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

declare const Buffer: {
  from(input: string, encoding: string): {
    toString(encoding: string): string
  }
}

export function getAccessToken(event: H3Event): string | null {
  const token = getCookie(event, 'access_token')
  return token || null
}

export function getRefreshToken(event: H3Event): string | null {
  const token = getCookie(event, 'refresh_token')
  return token || null
}

export function setAccessToken(event: H3Event, token: string, secure: boolean, sameSite: string): void {
  setCookie(event, 'access_token', token, {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/'
  })
}

export function setRefreshToken(event: H3Event, token: string, secure: boolean, sameSite: string): void {
  setCookie(event, 'refresh_token', token, {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/'
  })
}

export function clearTokens(event: H3Event): void {
  setCookie(event, 'access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  setCookie(event, 'refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })
}

type RefreshResponse = {
  access_token: string
  refresh_token?: string
}

type AuthFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

type AuthFetcher = <T>(
  request: string,
  options?: AuthFetchOptions
) => Promise<T>

export async function ensureAccessToken(event: H3Event): Promise<string> {
  const token = getAccessToken(event)
  if (token) return token
  return await refreshTokens(event)
}

export async function refreshTokens(event: H3Event): Promise<string> {
  const config = useRuntimeConfig(event)
  const refresh = getRefreshToken(event)
  if (!refresh) {
    clearTokens(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const res = await $fetch<RefreshResponse>(`${config.authServiceUrl}/v1/auth/refresh`, {
      method: 'POST',
      body: { refresh_token: refresh }
    })
    setAccessToken(event, res.access_token, config.cookieSecure, config.cookieSameSite)
    setRefreshToken(event, res.refresh_token || refresh, config.cookieSecure, config.cookieSameSite)
    return res.access_token
  } catch {
    clearTokens(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

export async function fetchWithAuthRetry<T>(
  event: H3Event,
  url: string,
  options: AuthFetchOptions = {}
): Promise<T> {
  const fetcher = $fetch as unknown as AuthFetcher
  let accessToken = await ensureAccessToken(event)
  try {
    return await fetcher<T>(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    })
  } catch (err: unknown) {
    if (!isUnauthorized(err)) throw err
    accessToken = await refreshTokens(event)
    return await fetcher<T>(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    })
  }
}

function isUnauthorized(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const statusCode = 'statusCode' in err ? (err as { statusCode?: unknown }).statusCode : undefined
  const status = 'status' in err ? (err as { status?: unknown }).status : undefined
  return statusCode === 401 || status === 401
}

export function getUserIdFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const data = JSON.parse(json) as { sub?: string }
    return data.sub || null
  } catch {
    return null
  }
}
