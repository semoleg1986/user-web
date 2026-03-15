import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

type AnswerPayload = {
  question_id: string
  value?: string
  selected_option_id?: string
  time_spent_ms?: number
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

  const answers: AnswerPayload[] = answersRaw.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}] must be an object`
      })
    }

    const questionId = (item as { question_id?: unknown }).question_id
    const valueRaw = (item as { value?: unknown }).value
    const selectedOptionRaw = (item as { selected_option_id?: unknown }).selected_option_id
    const timeSpentRaw = (item as { time_spent_ms?: unknown }).time_spent_ms
    if (typeof questionId !== 'string') {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}] must contain 'question_id'`
      })
    }
    ensureUuid(questionId, `answers[${idx}].question_id`)

    if (valueRaw !== undefined && typeof valueRaw !== 'string') {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}].value must be a string`
      })
    }
    if (selectedOptionRaw !== undefined && typeof selectedOptionRaw !== 'string') {
      throw createError({
        statusCode: 422,
        statusMessage: `answers[${idx}].selected_option_id must be a string`
      })
    }
    if (timeSpentRaw !== undefined) {
      if (!Number.isInteger(timeSpentRaw) || Number(timeSpentRaw) < 0) {
        throw createError({
          statusCode: 422,
          statusMessage: `answers[${idx}].time_spent_ms must be a non-negative integer`
        })
      }
    }

    const answer: AnswerPayload = { question_id: questionId }
    if (typeof valueRaw === 'string') {
      answer.value = valueRaw
    }
    if (typeof selectedOptionRaw === 'string') {
      answer.selected_option_id = selectedOptionRaw
    }
    if (typeof timeSpentRaw === 'number') {
      answer.time_spent_ms = timeSpentRaw
    }
    return answer
  })

  return await fetchWithAuthRetry(
    event,
    `${config.assessmentServiceUrl}/v1/user/attempts/${attemptId}/answers`,
    {
      method: 'POST',
      body: { answers }
    }
  )
})
