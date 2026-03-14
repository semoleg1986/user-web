import { ensureAccessToken, fetchWithAuthRetry, getUserIdFromJwt } from '~~/server/utils/auth'
import { ensureUuid } from '~~/server/utils/validation'

type TestItem = {
  test_id: string
  subject_code: string
  grade: number
  version: number
  questions: Array<{
    question_id: string
    node_id: string
    text: string
    question_type: 'text' | 'single_choice'
    options: Array<{
      option_id: string
      text: string
      position: number
    }>
    max_score: number
  }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = await ensureAccessToken(event)
  const userId = getUserIdFromJwt(token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const testId = getRouterParam(event, 'testId')
  if (!testId) {
    throw createError({ statusCode: 422, statusMessage: 'testId is required' })
  }
  ensureUuid(testId, 'testId')

  const tests = await fetchWithAuthRetry<TestItem[]>(event, `${config.assessmentServiceUrl}/v1/tests`, {
    method: 'GET'
  })

  const found = tests.find(t => t.test_id === testId)
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'Test not found' })
  }
  return found
})
