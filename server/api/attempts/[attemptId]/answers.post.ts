import { getAccessToken, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

type AnswerPayload = {
  question_id: string
  value: string
}

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

  const attemptId = getRouterParam(event, 'attemptId')
  if (!attemptId) {
    throw createError({ statusCode: 422, statusMessage: 'attemptId is required' })
  }
  ensureUuid(attemptId, 'attemptId')

  const rawBody = await readBody(event)
  const answersRaw
    = typeof rawBody === 'object'
      && rawBody !== null
      && 'answers' in rawBody
      && Array.isArray((rawBody as { answers?: unknown }).answers)
      ? (rawBody as { answers: unknown[] }).answers
      : []

  const answers: AnswerPayload[] = answersRaw.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}] must be an object`
      })
    }

    const questionId = (item as { question_id?: unknown }).question_id
    const value = (item as { value?: unknown }).value
    if (typeof questionId !== 'string' || typeof value !== 'string') {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}] must contain 'question_id' and 'value'`
      })
    }
    ensureUuid(questionId, `answers[${idx}].question_id`)

    return { question_id: questionId, value }
  })

  return await $fetch(
    `${config.assessmentServiceUrl}/v1/user/attempts/${attemptId}/answers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { answers }
    }
  )
})
