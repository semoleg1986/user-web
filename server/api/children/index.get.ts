import { getAccessToken, getUserIdFromJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getAccessToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  return await $fetch(`${config.userChildrenServiceUrl}/v1/user/users/${userId}/children`, {
    headers: { Authorization: `Bearer ${token}` },
  })
})
