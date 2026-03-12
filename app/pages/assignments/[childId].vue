<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">
          Assessment
        </p>
        <h1>Assignments</h1>
      </div>
      <NuxtLink
        class="btn btn--ghost"
        to="/children"
      >Back to children</NuxtLink>
    </header>

    <section class="context-card">
      <div>
        <p class="context-label">
          Child
        </p>
        <h2>{{ childNameLabel }}</h2>
      </div>
      <div class="context-stats">
        <span>Total: {{ assignments.length }}</span>
        <span>Assigned: {{ grouped.assigned.length }}</span>
        <span>Started: {{ grouped.started.length }}</span>
        <span>Submitted: {{ grouped.submitted.length }}</span>
      </div>
    </section>

    <section class="layout-grid">
      <div class="main-column">
        <section
          v-for="section in sections"
          :key="section.key"
          class="card"
        >
          <div class="card__header">
            <h2>{{ section.title }}</h2>
            <span class="badge">{{ section.items.length }}</span>
          </div>

          <article
            v-for="item in section.items"
            :key="item.assignment_id"
            class="assignment"
          >
            <div>
              <h3>{{ item.test_title || `Test ${item.test_id}` }}</h3>
              <p>Status: {{ item.status }}</p>
              <p v-if="item.due_at">
                Due: {{ item.due_at }}
              </p>
            </div>
            <button
              class="btn"
              :disabled="loading"
              @click="start(item)"
            >
              {{ actionLabel(item.status) }}
            </button>
          </article>

          <p
            v-if="!section.items.length"
            class="muted"
          >
            No items.
          </p>
        </section>
      </div>

      <aside class="side-column">
        <section class="card card--sticky">
          <h2>Quick actions</h2>
          <p class="muted">
            Use "Continue" for started assignments.
          </p>
          <button
            class="btn btn--ghost"
            :disabled="loading || assignmentsResource.isLoading.value || assignmentsResource.isRefreshing.value"
            @click="load"
          >
            {{ assignmentsResource.isRefreshing.value ? 'Syncing...' : 'Refresh assignments' }}
          </button>
          <NuxtLink
            class="btn btn--ghost"
            to="/children"
          >
            Back to workspace
          </NuxtLink>
        </section>
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
type AssignmentItem = {
  assignment_id: string
  test_id: string
  test_title?: string
  status: string
  due_at?: string | null
}

type GroupedAssignments = {
  assigned: AssignmentItem[]
  started: AssignmentItem[]
  submitted: AssignmentItem[]
  other: AssignmentItem[]
}

const route = useRoute()
const childId = computed(() => String(route.params.childId || ''))
const childNameLabel = computed(() => {
  const raw = String(route.query.name || '').trim()
  if (raw) return raw
  return `Child ${childId.value.slice(0, 8)}`
})

const assignments = ref<AssignmentItem[]>([])
const loading = ref(false)
const error = ref('')
const assignmentsResource = useLiveResource(
  async () => await $fetch<AssignmentItem[]>(`/api/assignments?childId=${encodeURIComponent(childId.value)}`),
  {
    pollIntervalMs: 20000,
    pollWhenHidden: false,
    refetchOnFocus: true,
    refetchOnReconnect: true
  }
)

const grouped = computed<GroupedAssignments>(() => {
  const assigned: AssignmentItem[] = []
  const started: AssignmentItem[] = []
  const submitted: AssignmentItem[] = []
  const other: AssignmentItem[] = []

  for (const item of assignments.value) {
    const status = String(item.status || '').toLowerCase()
    if (status === 'assigned') {
      assigned.push(item)
      continue
    }
    if (status === 'started') {
      started.push(item)
      continue
    }
    if (status === 'submitted') {
      submitted.push(item)
      continue
    }
    other.push(item)
  }

  return { assigned, started, submitted, other }
})

const sections = computed(() => [
  { key: 'assigned', title: 'Assigned', items: grouped.value.assigned },
  { key: 'started', title: 'Started', items: grouped.value.started },
  { key: 'submitted', title: 'Submitted', items: grouped.value.submitted },
  { key: 'other', title: 'Other', items: grouped.value.other }
])

const actionLabel = (status: string): string => {
  const normalized = status.toLowerCase()
  if (normalized === 'started') {
    return 'Continue'
  }
  if (normalized === 'submitted') {
    return 'Restart'
  }
  return 'Start'
}

const load = async () => {
  await assignmentsResource.refresh()
}

const start = async (item: AssignmentItem) => {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ attempt_id: string }>('/api/attempts/start', {
      method: 'POST',
      body: {
        assignment_id: item.assignment_id,
        child_id: childId.value
      }
    })
    await navigateTo(
      `/attempts/${res.attempt_id}?testId=${item.test_id}&childId=${childId.value}&name=${encodeURIComponent(childNameLabel.value)}`
    )
  } catch (err: unknown) {
    const message
      = typeof err === 'object' && err !== null && 'data' in err
        ? String(
            ((err as { data?: { detail?: string } }).data?.detail
              ?? 'Failed to start attempt')
          )
        : 'Failed to start attempt'
    error.value = message
  } finally {
    loading.value = false
  }
}

watch(
  () => assignmentsResource.data.value,
  (value) => {
    assignments.value = value ?? []
  },
  { immediate: true }
)

watch(
  () => assignmentsResource.error.value,
  (value) => {
    if (!value) return
    error.value = value
  }
)
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

.context-card {
  max-width: 1120px;
  margin: 0 auto 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.context-label {
  margin: 0;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
}

.context-card h2 {
  margin: 6px 0 0;
}

.context-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.context-stats span {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.85rem;
  color: var(--muted);
}

.layout-grid {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
}

.main-column,
.side-column {
  min-width: 0;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card__header h2 {
  margin: 0;
}

.badge {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.8rem;
  color: var(--muted);
}

.assignment {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.assignment:last-of-type {
  margin-bottom: 0;
}

.assignment h3 {
  margin: 0;
}

.assignment p {
  margin: 4px 0 0;
  color: var(--muted);
}

.card--sticky {
  position: sticky;
  top: 84px;
  display: grid;
  gap: 10px;
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

  .assignment {
    align-items: flex-start;
    flex-direction: column;
  }
}

:global(.dark) .btn {
  background: #2563eb;
  color: #e5e7eb;
}
</style>
