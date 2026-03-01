import { readOptionalStringField, readRequiredStringField } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event)
  const password = readRequiredStringField(rawBody, 'password', { minLength: 6, maxLength: 255 })
  const email = readOptionalStringField(rawBody, 'email', { minLength: 5, maxLength: 255 })
  const phone = readOptionalStringField(rawBody, 'phone', { minLength: 5, maxLength: 32 })
  if (!email && !phone) {
    throw createError({ statusCode: 422, statusMessage: "Either 'email' or 'phone' is required" })
  }
  const config = useRuntimeConfig()

  try {
    const res = await $fetch(`${config.authServiceUrl}/v1/auth/register`, {
      method: 'POST',
      body: { email, phone, password },
    })
    return res
  } catch (err: unknown) {
    const statusCode =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined
    if (statusCode === 409) {
      return { ok: true, alreadyExists: true }
    }
    throw err
  }
})
