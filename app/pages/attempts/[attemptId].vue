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
      <ul>
        <li
          v-for="row in result.answers"
          :key="row.question_id"
        >
          {{ row.question_id }} — {{ row.is_correct ? 'correct' : 'wrong' }}
        </li>
      </ul>
    </section>

    <section
      v-else
      class="card"
    >
      <h2>Questions</h2>
      <article
        v-for="q in questions"
        :key="q.question_id"
        class="question"
      >
        <label>
          <strong>{{ q.text }}</strong>
          <input
            v-model="answers[q.question_id]"
            type="text"
            placeholder="Your answer"
          >
        </label>
      </article>
      <div class="actions">
        <button
          class="btn btn--ghost"
          :disabled="loading"
          @click="saveAnswers"
        >
          Save draft
        </button>
        <button
          class="btn"
          :disabled="loading"
          @click="submitAttempt"
        >
          Submit
        </button>
      </div>
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
    is_correct: boolean
  }>
}

const route = useRoute()
const attemptId = computed(() => String(route.params.attemptId || ''))
const testId = computed(() => String(route.query.testId || ''))
const childId = computed(() => String(route.query.childId || ''))
const backTo = computed(() => (childId.value ? `/assignments/${childId.value}` : '/children'))

const questions = ref<TestQuestion[]>([])
const answers = ref<Record<string, string>>({})
const loading = ref(false)
const error = ref('')
const result = ref<AttemptResult | null>(null)

const loadQuestions = async () => {
  if (!testId.value) {
    error.value = 'testId is required'
    return
  }
  try {
    const test = await $fetch<TestDetails>(`/api/tests/${testId.value}`)
    questions.value = test.questions
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

const payloadAnswers = () =>
  questions.value.map(q => ({
    question_id: q.question_id,
    value: answers.value[q.question_id] || ''
  }))

const saveAnswers = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/attempts/${attemptId.value}/answers`, {
      method: 'POST',
      body: { answers: payloadAnswers() }
    })
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
  background: radial-gradient(circle at 10% 20%, #f8fafc, #ffffff 45%, #fdf2f8 95%);
  padding: 32px 20px 60px;
}
.header {
  max-width: 900px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: #6b7280;
}
.card {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  display: grid;
  gap: 14px;
}
.question input {
  width: 100%;
  margin-top: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
}
.actions {
  display: flex;
  gap: 10px;
}
.btn {
  background: #111827;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.btn--ghost {
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
  text-decoration: none;
}
.error {
  max-width: 900px;
  margin: 20px auto 0;
  color: #b91c1c;
}
</style>
