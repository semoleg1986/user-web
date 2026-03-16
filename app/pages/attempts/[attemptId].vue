<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">
          Assessment
        </p>
        <h1>Attempt</h1>
      </div>
      <NuxtLink
        class="btn btn--ghost"
        :to="backTo"
      >Back</NuxtLink>
    </header>

    <section
      v-if="result"
      class="card"
    >
      <h2>Result</h2>
      <p>Status: {{ result.status }}</p>
      <p>Score: {{ result.score }}</p>
      <ul class="result-list">
        <li
          v-for="row in result.answers"
          :key="row.question_id"
        >
          <div class="result-item__left">
            <span>{{ row.question_id }}</span>
            <span class="muted">{{ formatDuration(row.time_spent_ms ?? 0) }}</span>
          </div>
          <strong :class="row.is_correct ? 'ok' : 'bad'">
            {{ row.is_correct ? 'correct' : 'wrong' }}
          </strong>
        </li>
      </ul>
    </section>

    <section
      v-else
      class="layout-grid"
    >
      <section class="card">
        <h2>Question {{ currentQuestionNumber }} / {{ totalCount }}</h2>

        <article
          v-if="currentQuestion"
          :key="currentQuestion.question_id"
          class="question"
        >
          <div class="question__head">
            <strong class="question__title">{{ currentQuestion.text }}</strong>
            <span class="chip">{{ currentQuestion.question_type }}</span>
          </div>

          <div v-if="currentQuestion.question_type === 'single_choice'">
            <label
              v-for="option in currentQuestion.options"
              :key="`${currentQuestion.question_id}-${option.option_id}`"
              class="choice"
            >
              <input
                v-model="selectedOptions[currentQuestion.question_id]"
                type="radio"
                :name="`question-${currentQuestion.question_id}`"
                :value="option.option_id"
              >
              <span>{{ option.text }}</span>
            </label>
            <p
              v-if="!currentQuestion.options.length"
              class="muted"
            >
              No options available.
            </p>
          </div>

          <label v-else>
            <input
              v-model="textAnswers[currentQuestion.question_id]"
              type="text"
              placeholder="Your answer"
            >
          </label>

          <div class="question__meta">
            <span class="muted">Time on this question: {{ formatDuration(currentQuestionElapsedMs) }}</span>
          </div>

          <div class="question__nav">
            <button
              class="btn btn--ghost"
              :disabled="isSubmitting || currentIndex <= 0"
              @click="goPrev"
            >
              Previous
            </button>
            <button
              class="btn btn--ghost"
              :disabled="isSubmitting || currentIndex >= totalCount - 1"
              @click="goNext"
            >
              Next
            </button>
          </div>
        </article>

        <p
          v-else
          class="muted"
        >
          No questions found for this test.
        </p>
      </section>

      <aside class="card card--sticky">
        <h2>Progress</h2>
        <p class="muted">
          {{ answeredCount }} / {{ totalCount }} answered
        </p>
        <p class="muted">
          Total time: {{ formatDuration(totalTimeSpentMs) }}
        </p>
        <p
          class="dirty"
          :class="hasUnsaved ? 'dirty--yes' : 'dirty--no'"
        >
          {{ hasUnsaved ? 'Unsaved changes' : 'All changes saved' }}
        </p>

        <div
          class="progress-dots"
          role="list"
          aria-label="Questions progress"
        >
          <button
            v-for="(question, index) in questions"
            :key="question.question_id"
            type="button"
            role="listitem"
            class="progress-dots__item"
            :disabled="isSubmitting"
            :aria-label="`Go to question ${index + 1}`"
            :title="questionDotTitle(question, index)"
            :class="{
              'progress-dots__item--answered': isQuestionAnswered(question),
              'progress-dots__item--active': index === currentIndex
            }"
            @click="goToQuestion(index)"
          />
        </div>

        <button
          class="btn btn--ghost"
          :disabled="isSubmitting || isSavingDraft"
          @click="saveAnswers()"
        >
          Save draft
        </button>
        <button
          class="btn"
          :disabled="isSubmitting || isSavingDraft || !questions.length"
          @click="submitAttempt"
        >
          Submit
        </button>
      </aside>
    </section>

    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
  </main>
</template>

<script setup lang="ts">
type TestQuestion = {
  question_id: string
  text: string
  question_type: 'text' | 'single_choice'
  options: Array<{
    option_id: string
    text: string
    position: number
  }>
}

type TestDetails = {
  test_id: string
  questions: TestQuestion[]
}

type AttemptResult = {
  attempt_id: string
  status: string
  score: number
  answers: Array<{
    question_id: string
    value: string | null
    selected_option_id: string | null
    resolved_diagnostic_tag: string | null
    time_spent_ms: number | null
    is_correct: boolean
  }>
}

type AnswerPayload = {
  question_id: string
  value?: string
  selected_option_id?: string
  time_spent_ms?: number
}

const route = useRoute()
const attemptId = computed(() => String(route.params.attemptId || ''))
const testId = computed(() => String(route.query.testId || ''))
const childId = computed(() => String(route.query.childId || ''))
const backTo = computed(() => {
  if (!childId.value) return '/children'
  const childName = String(route.query.name || '').trim()
  if (!childName) {
    return `/assignments/${childId.value}`
  }
  return `/assignments/${childId.value}?name=${encodeURIComponent(childName)}`
})

const questions = ref<TestQuestion[]>([])
const textAnswers = ref<Record<string, string>>({})
const selectedOptions = ref<Record<string, string>>({})
const timeSpentMsByQuestion = ref<Record<string, number>>({})
const activeQuestionId = ref<string | null>(null)
const questionEnteredAtMs = ref(0)
const currentIndex = ref(0)
const nowTick = ref(Date.now())
const isSavingDraft = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const result = ref<AttemptResult | null>(null)
const savedSignature = ref('')
let ticker: ReturnType<typeof setInterval> | null = null
let autosaveTicker: ReturnType<typeof setInterval> | null = null
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null

const AUTOSAVE_INTERVAL_MS = 15000
const INPUT_SAVE_DEBOUNCE_MS = 1200

const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const currentQuestionNumber = computed(() => {
  if (!questions.value.length) return 0
  return currentIndex.value + 1
})

const formatDuration = (valueMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const minutesLabel = String(minutes).padStart(2, '0')
  const secondsLabel = String(seconds).padStart(2, '0')
  return `${minutesLabel}:${secondsLabel}`
}

const startTicker = () => {
  if (ticker) return
  ticker = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
}

const stopTicker = () => {
  if (!ticker) return
  clearInterval(ticker)
  ticker = null
}

const startAutosaveTicker = () => {
  if (autosaveTicker) return
  autosaveTicker = setInterval(() => {
    if (result.value) return
    if (isSavingDraft.value || isSubmitting.value) return
    if (!questions.value.length) return
    if (!hasUnsaved.value) return
    void saveAnswers({ silent: true })
  }, AUTOSAVE_INTERVAL_MS)
}

const stopAutosaveTicker = () => {
  if (!autosaveTicker) return
  clearInterval(autosaveTicker)
  autosaveTicker = null
}

const stopDraftSaveTimer = () => {
  if (!draftSaveTimer) return
  clearTimeout(draftSaveTimer)
  draftSaveTimer = null
}

const activateQuestionTimer = (questionId: string) => {
  activeQuestionId.value = questionId
  questionEnteredAtMs.value = Date.now()
}

const flushCurrentQuestionTime = () => {
  const questionId = activeQuestionId.value
  if (!questionId || questionEnteredAtMs.value <= 0) return
  const elapsed = Date.now() - questionEnteredAtMs.value
  if (elapsed > 0) {
    timeSpentMsByQuestion.value[questionId] = (timeSpentMsByQuestion.value[questionId] || 0) + elapsed
  }
  questionEnteredAtMs.value = Date.now()
}

const setQuestionByIndex = (targetIndex: number) => {
  if (targetIndex < 0 || targetIndex >= questions.value.length) return
  if (activeQuestionId.value) {
    flushCurrentQuestionTime()
  }
  currentIndex.value = targetIndex
  const nextQuestion = questions.value[targetIndex]
  if (nextQuestion) {
    activateQuestionTimer(nextQuestion.question_id)
  }
}

const payloadAnswers = (includeTime: boolean): AnswerPayload[] =>
  questions.value.map((question) => {
    const answer: AnswerPayload = {
      question_id: question.question_id
    }

    if (question.question_type === 'single_choice') {
      const selected = selectedOptions.value[question.question_id] || ''
      if (selected) {
        answer.selected_option_id = selected
      }
    } else {
      answer.value = textAnswers.value[question.question_id] || ''
    }

    if (includeTime) {
      answer.time_spent_ms = Math.max(
        0,
        Math.round(timeSpentMsByQuestion.value[question.question_id] || 0)
      )
    }

    return answer
  })

const snapshot = () => JSON.stringify(payloadAnswers(false))

const answeredCount = computed(() =>
  payloadAnswers(false).filter((item) => {
    if (typeof item.selected_option_id === 'string') {
      return item.selected_option_id.trim().length > 0
    }
    return typeof item.value === 'string' && item.value.trim().length > 0
  }).length
)
const totalCount = computed(() => questions.value.length)
const hasUnsaved = computed(() => snapshot() !== savedSignature.value)
const isQuestionAnswered = (question: TestQuestion): boolean => {
  if (question.question_type === 'single_choice') {
    return Boolean((selectedOptions.value[question.question_id] || '').trim())
  }
  return Boolean((textAnswers.value[question.question_id] || '').trim())
}
const questionDotTitle = (question: TestQuestion, index: number): string => {
  const status = isQuestionAnswered(question) ? 'answered' : 'not answered'
  return `Question ${index + 1}: ${status}`
}

const currentQuestionElapsedMs = computed(() => {
  const question = currentQuestion.value
  if (!question) return 0
  const base = timeSpentMsByQuestion.value[question.question_id] || 0
  if (
    activeQuestionId.value === question.question_id
    && questionEnteredAtMs.value > 0
  ) {
    return base + Math.max(0, nowTick.value - questionEnteredAtMs.value)
  }
  return base
})

const totalTimeSpentMs = computed(() => {
  const known = Object.values(timeSpentMsByQuestion.value).reduce((sum, value) => sum + value, 0)
  if (
    currentQuestion.value
    && activeQuestionId.value === currentQuestion.value.question_id
    && questionEnteredAtMs.value > 0
  ) {
    return known + Math.max(0, nowTick.value - questionEnteredAtMs.value)
  }
  return known
})

const loadQuestions = async () => {
  error.value = ''
  if (!testId.value) {
    error.value = 'testId is required'
    return
  }

  try {
    const test = await $fetch<TestDetails>(`/api/tests/${testId.value}`)
    questions.value = test.questions

    const initialText: Record<string, string> = {}
    const initialSelected: Record<string, string> = {}
    const initialTime: Record<string, number> = {}

    for (const question of test.questions) {
      if (question.question_type === 'single_choice') {
        initialSelected[question.question_id] = ''
      } else {
        initialText[question.question_id] = ''
      }
      initialTime[question.question_id] = 0
    }

    textAnswers.value = initialText
    selectedOptions.value = initialSelected
    timeSpentMsByQuestion.value = initialTime
    currentIndex.value = 0
    activeQuestionId.value = null
    questionEnteredAtMs.value = 0

    savedSignature.value = snapshot()
  } catch (err: unknown) {
    const message
      = typeof err === 'object' && err !== null && 'data' in err
        ? String(
            ((err as { data?: { detail?: string } }).data?.detail
              ?? 'Failed to load questions')
          )
        : 'Failed to load questions'
    error.value = message
  }
}

const applySavedAttemptState = (attemptState: AttemptResult) => {
  const nextText = { ...textAnswers.value }
  const nextSelected = { ...selectedOptions.value }
  const nextTime = { ...timeSpentMsByQuestion.value }
  const byQuestionId = new Map(
    attemptState.answers.map(item => [item.question_id, item] as const)
  )

  for (const question of questions.value) {
    const saved = byQuestionId.get(question.question_id)
    if (!saved) continue

    if (question.question_type === 'single_choice') {
      nextSelected[question.question_id] = saved.selected_option_id ?? ''
    } else {
      nextText[question.question_id] = saved.value ?? ''
    }

    nextTime[question.question_id] = Math.max(0, saved.time_spent_ms ?? 0)
  }

  textAnswers.value = nextText
  selectedOptions.value = nextSelected
  timeSpentMsByQuestion.value = nextTime

  const firstUnansweredIndex = questions.value.findIndex((question) => {
    if (question.question_type === 'single_choice') {
      return !selectedOptions.value[question.question_id]
    }
    return !(textAnswers.value[question.question_id] || '').trim()
  })
  if (firstUnansweredIndex >= 0) {
    currentIndex.value = firstUnansweredIndex
    return
  }
  currentIndex.value = Math.max(0, questions.value.length - 1)
}

const loadAttemptState = async () => {
  try {
    const attemptState = await $fetch<AttemptResult>(
      `/api/attempts/${attemptId.value}/result`
    )

    const status = attemptState.status.toLowerCase()
    if (status === 'submitted') {
      result.value = attemptState
      activeQuestionId.value = null
      questionEnteredAtMs.value = 0
      return
    }

    applySavedAttemptState(attemptState)
    savedSignature.value = snapshot()
  } catch (err: unknown) {
    const statusCode = (
      typeof err === 'object'
      && err !== null
      && 'statusCode' in err
      && typeof (err as { statusCode?: unknown }).statusCode === 'number'
    )
      ? Number((err as { statusCode: number }).statusCode)
      : undefined

    if (statusCode === 404) {
      return
    }
  }
}

const saveAnswers = async (options: { silent?: boolean } = {}) => {
  if (result.value) return
  if (isSavingDraft.value || isSubmitting.value) return
  if (!questions.value.length) return
  if (!hasUnsaved.value) return
  if (!options.silent) {
    error.value = ''
  }
  isSavingDraft.value = true
  flushCurrentQuestionTime()
  const requestSignature = snapshot()

  try {
    await $fetch(`/api/attempts/${attemptId.value}/answers`, {
      method: 'POST',
      body: { answers: payloadAnswers(true) }
    })
    savedSignature.value = requestSignature
  } catch (err: unknown) {
    if (!options.silent) {
      const message
        = typeof err === 'object' && err !== null && 'data' in err
          ? String(
              ((err as { data?: { detail?: string } }).data?.detail
                ?? 'Failed to save answers')
            )
          : 'Failed to save answers'
      error.value = message
    }
  } finally {
    isSavingDraft.value = false
  }
}

const submitAttempt = async () => {
  error.value = ''
  if (isSubmitting.value) return
  isSubmitting.value = true
  flushCurrentQuestionTime()

  try {
    await $fetch(`/api/attempts/${attemptId.value}/submit`, {
      method: 'POST',
      body: { answers: payloadAnswers(true) }
    })
    savedSignature.value = snapshot()
    result.value = await $fetch<AttemptResult>(`/api/attempts/${attemptId.value}/result`)
    activeQuestionId.value = null
    questionEnteredAtMs.value = 0
  } catch (err: unknown) {
    const message
      = typeof err === 'object' && err !== null && 'data' in err
        ? String(
            ((err as { data?: { detail?: string } }).data?.detail
              ?? 'Failed to submit attempt')
          )
        : 'Failed to submit attempt'
    error.value = message
  } finally {
    isSubmitting.value = false
  }
}

const goNext = () => {
  setQuestionByIndex(currentIndex.value + 1)
  void saveAnswers({ silent: true })
}

const goPrev = () => {
  setQuestionByIndex(currentIndex.value - 1)
  void saveAnswers({ silent: true })
}

const goToQuestion = (targetIndex: number) => {
  if (targetIndex === currentIndex.value) return
  setQuestionByIndex(targetIndex)
  void saveAnswers({ silent: true })
}

const persistAnswersOnUnload = () => {
  if (result.value || !questions.value.length || isSubmitting.value) return
  if (!hasUnsaved.value) return

  const body = JSON.stringify({ answers: payloadAnswers(true) })
  const url = `/api/attempts/${attemptId.value}/answers`
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
    return
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin'
  })
}

const onVisibilityChange = () => {
  if (document.hidden) {
    flushCurrentQuestionTime()
    questionEnteredAtMs.value = 0
    persistAnswersOnUnload()
    return
  }
  if (currentQuestion.value && !result.value) {
    activateQuestionTimer(currentQuestion.value.question_id)
  }
}

const onPageHide = () => {
  flushCurrentQuestionTime()
  questionEnteredAtMs.value = 0
  persistAnswersOnUnload()
}

const queueDraftSave = () => {
  if (result.value || isSubmitting.value) return
  stopDraftSaveTimer()
  draftSaveTimer = setTimeout(() => {
    void saveAnswers({ silent: true })
  }, INPUT_SAVE_DEBOUNCE_MS)
}

watch([textAnswers, selectedOptions], queueDraftSave, { deep: true })

onMounted(async () => {
  startTicker()
  startAutosaveTicker()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  await loadQuestions()
  await loadAttemptState()
  if (!result.value && currentQuestion.value) {
    activateQuestionTimer(currentQuestion.value.question_id)
  }
})

onBeforeUnmount(() => {
  onPageHide()
  stopTicker()
  stopAutosaveTicker()
  stopDraftSaveTimer()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding: 30px 20px 60px;
}

.header {
  max-width: 1120px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: var(--muted);
}

.layout-grid {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

.card h2 {
  margin: 0 0 12px;
}

.question {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

label {
  display: grid;
  gap: 8px;
}

.question__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.question__title {
  flex: 1;
}

.question__nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.question__meta {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
}

.choice {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
}

input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--panel);
  color: var(--text);
}

.card--sticky {
  position: sticky;
  top: 84px;
  height: fit-content;
  display: grid;
  gap: 10px;
}

.progress-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0;
}

.progress-dots__item {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 45%, transparent);
  border: 1px solid var(--border);
  padding: 0;
  cursor: pointer;
}

.progress-dots__item:disabled {
  cursor: not-allowed;
}

.progress-dots__item--answered {
  background: #22c55e;
  border-color: #16a34a;
}

.progress-dots__item--active {
  box-shadow: 0 0 0 2px color-mix(in srgb, #2563eb 35%, transparent);
}

.result-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.result-list li {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.result-item__left {
  display: grid;
  gap: 4px;
}

.ok {
  color: #166534;
}

.bad {
  color: #b91c1c;
}

.dirty {
  margin: 0;
  font-size: 0.9rem;
}

.dirty--yes {
  color: #92400e;
}

.dirty--no {
  color: #166534;
}

.btn {
  border: 1px solid transparent;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  padding: 9px 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
}

.btn--ghost {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
}

.muted {
  color: var(--muted);
}

.error {
  max-width: 1120px;
  margin: 16px auto 0;
  color: #b91c1c;
}

@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .card--sticky {
    position: static;
  }
}

:global(.dark) .btn {
  background: #2563eb;
  color: #e5e7eb;
}
</style>
