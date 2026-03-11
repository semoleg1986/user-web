import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  return await fetchWithAuthRetry(event, `${config.userChildrenServiceUrl}/v1/user/users/${userId}/children`, {
    method: 'GET'
  })
})
