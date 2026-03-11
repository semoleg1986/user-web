import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  try {
    const children = await fetchWithAuthRetry(
      event,
      `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children`,
      {
        method: 'GET'
      }
    )

    return { user_id: userId, children, needs_profile: false }
  } catch (err: unknown) {
    const statusCode =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined
    const message =
      typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
    const code =
      typeof err === 'object' &&
      err !== null &&
      'cause' in err &&
      typeof (err as { cause?: unknown }).cause === 'object' &&
      (err as { cause?: unknown }).cause !== null &&
      'code' in ((err as { cause?: unknown }).cause as object)
        ? ((err as { cause?: { code?: string } }).cause?.code ?? '')
        : ''

    if (statusCode === 404) {
      return { user_id: userId, children: [], needs_profile: true }
    }
    if (code === 'ECONNREFUSED' || message === 'fetch failed') {
      throw createError({
        statusCode: 503,
        statusMessage: 'User service is unavailable'
      })
    }
    throw err
  }
})
