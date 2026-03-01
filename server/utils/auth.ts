import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

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
    path: '/',
  })
}

export function setRefreshToken(event: H3Event, token: string, secure: boolean, sameSite: string): void {
  setCookie(event, 'refresh_token', token, {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/',
  })
}

export function clearTokens(event: H3Event): void {
  setCookie(event, 'access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  setCookie(event, 'refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })
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
