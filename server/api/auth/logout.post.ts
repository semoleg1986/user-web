import { clearTokens, getRefreshToken } from '~~/server/utils/auth'
import { readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const refresh = getRefreshToken(event)
  if (refresh) {
    readRequiredStringField({ refresh_token: refresh }, 'refresh_token', { minLength: 20, maxLength: 4096 })
    try {
      await $fetch(`${config.authServiceUrl}/v1/auth/logout`, {
        method: 'POST',
        body: { refresh_token: refresh }
      })
    } catch {
      // ignore upstream logout errors
    }
  }
  clearTokens(event)
  return { ok: true }
})
