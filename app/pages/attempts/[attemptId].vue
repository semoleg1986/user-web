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
          <span>{{ row.question_id }}</span>
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
        <h2>Questions</h2>
        <article
          v-for="q in questions"
          :key="q.question_id"
          class="question"
        >
          <div class="question__head">
            <strong>{{ q.text }}</strong>
            <span class="chip">{{ q.question_type }}</span>
          </div>

          <div v-if="q.question_type === 'single_choice'">
            <label
              v-for="option in q.options"
              :key="`${q.question_id}-${option.option_id}`"
              class="choice"
            >
              <input
                v-model="selectedOptions[q.question_id]"
                type="radio"
                :name="`question-${q.question_id}`"
                :value="option.option_id"
              >
              <span>{{ option.text }}</span>
            </label>
            <p
              v-if="!q.options.length"
              class="muted"
            >
              No options available.
            </p>
          </div>

          <label v-else>
            <input
              v-model="textAnswers[q.question_id]"
              type="text"
              placeholder="Your answer"
            >
          </label>
        </article>

        <p
          v-if="!questions.length"
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
        <p
          class="dirty"
          :class="hasUnsaved ? 'dirty--yes' : 'dirty--no'"
        >
          {{ hasUnsaved ? 'Unsaved changes' : 'All changes saved' }}
        </p>
        <button
          class="btn btn--ghost"
          :disabled="loading"
          @click="saveAnswers"
        >
          Save draft
        </button>
        <button
          class="btn"
          :disabled="loading || !questions.length"
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
    is_correct: boolean
  }>
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
const loading = ref(false)
const error = ref('')
const result = ref<AttemptResult | null>(null)
const savedSignature = ref('')

type AnswerPayload = {
  question_id: string
  value?: string
  selected_option_id?: string
}

const payloadAnswers = (): AnswerPayload[] =>
  questions.value.map((question) => {
    if (question.question_type === 'single_choice') {
      const selected = selectedOptions.value[question.question_id] || ''
      return {
        question_id: question.question_id,
        selected_option_id: selected || undefined
      }
    }
    return {
      question_id: question.question_id,
      value: textAnswers.value[question.question_id] || ''
    }
  })

const snapshot = () => JSON.stringify(payloadAnswers())

const answeredCount = computed(() =>
  payloadAnswers().filter((item) => {
    if (typeof item.selected_option_id === 'string') {
      return item.selected_option_id.trim().length > 0
    }
    return typeof item.value === 'string' && item.value.trim().length > 0
  }).length
)
const totalCount = computed(() => questions.value.length)
const hasUnsaved = computed(() => snapshot() !== savedSignature.value)

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
    for (const question of test.questions) {
      if (question.question_type === 'single_choice') {
        initialSelected[question.question_id] = ''
      } else {
        initialText[question.question_id] = ''
      }
    }
    textAnswers.value = initialText
    selectedOptions.value = initialSelected
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

const saveAnswers = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/attempts/${attemptId.value}/answers`, {
      method: 'POST',
      body: { answers: payloadAnswers() }
    })
    savedSignature.value = snapshot()
  } catch (err: unknown) {
    const message
      = typeof err === 'object' && err !== null && 'data' in err
        ? String(
            ((err as { data?: { detail?: string } }).data?.detail
              ?? 'Failed to save answers')
          )
        : 'Failed to save answers'
    error.value = message
  } finally {
    loading.value = false
  }
}

const submitAttempt = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/attempts/${attemptId.value}/submit`, {
      method: 'POST',
      body: { answers: payloadAnswers() }
    })
    savedSignature.value = snapshot()
    result.value = await $fetch<AttemptResult>(`/api/attempts/${attemptId.value}/result`)
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
    loading.value = false
  }
}

onMounted(loadQuestions)
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
  margin-bottom: 10px;
  display: grid;
  gap: 10px;
}

.question:last-of-type {
  margin-bottom: 0;
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
  gap: 10px;
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
