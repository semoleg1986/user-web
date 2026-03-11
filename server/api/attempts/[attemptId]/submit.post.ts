import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

type SubmitAnswerPayload = {
  question_id: string
  value: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
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

  const answers: SubmitAnswerPayload[] = answersRaw.map((item, idx) => {
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

  return await fetchWithAuthRetry(
    event,
    `${config.assessmentServiceUrl}/v1/user/attempts/${attemptId}/submit`,
    {
      method: 'POST',
      body: { answers }
    }
  )
})
