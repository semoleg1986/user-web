<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">
          Children
        </p>
        <h1>Your workspace</h1>
      </div>
      <button
        class="btn btn--ghost"
        :disabled="loading"
        @click="loadChildren"
      >
        Refresh
      </button>
    </header>

    <section class="stats-grid">
      <article class="stats-card">
        <p>Profile</p>
        <strong>{{ needsProfile ? 'Needs setup' : 'Ready' }}</strong>
      </article>
      <article class="stats-card">
        <p>Children</p>
        <strong>{{ activeChildren.length }}</strong>
      </article>
      <article class="stats-card">
        <p>Active assignments</p>
        <strong>{{ activeAssignmentsLabel }}</strong>
      </article>
    </section>

    <section class="layout-grid">
      <div class="main-column">
        <section class="card">
          <div class="card__header">
            <h2>Active children</h2>
          </div>

          <article
            v-for="child in activeChildren"
            :key="child.child_id"
            class="child"
          >
            <div>
              <h3>{{ child.name }}</h3>
              <p>{{ child.birthdate }}</p>
            </div>
            <div class="actions">
              <NuxtLink
                class="btn btn--ghost"
                :to="`/assignments/${child.child_id}?name=${encodeURIComponent(child.name)}`"
              >
                Assignments
              </NuxtLink>
              <button
                class="btn btn--ghost"
                @click="removeChild(child.child_id)"
              >
                Archive
              </button>
            </div>
          </article>

          <p
            v-if="!activeChildren.length"
            class="muted"
          >
            No active children yet.
          </p>
        </section>

        <section class="card">
          <details :open="archivedChildren.length > 0">
            <summary>Archived children ({{ archivedChildren.length }})</summary>
            <div class="archived-list">
              <article
                v-for="child in archivedChildren"
                :key="child.child_id"
                class="child child--archived"
              >
                <div>
                  <h3>{{ child.name }}</h3>
                  <p>{{ child.birthdate }}</p>
                </div>
                <button
                  class="btn"
                  :disabled="loading"
                  @click="restoreChild(child.child_id)"
                >
                  Restore
                </button>
              </article>

              <p
                v-if="!archivedChildren.length"
                class="muted"
              >
                No archived children.
              </p>
            </div>
          </details>
        </section>
      </div>

      <aside class="side-column">
        <section class="card card--sticky">
          <div class="stack">
            <div>
              <h2>Profile</h2>
              <p class="muted">
                Required before adding children.
              </p>
            </div>

            <form
              v-if="needsProfile"
              class="form"
              @submit.prevent="onCreateUser"
            >
              <label>
                Name
                <input
                  v-model="userName"
                  type="text"
                  placeholder="Your name"
                  required
                >
              </label>
              <button
                class="btn"
                type="submit"
                :disabled="loading"
              >
                Save profile
              </button>
            </form>

            <p
              v-else
              class="notice"
            >
              Profile is set.
            </p>

            <hr class="sep">

            <form
              class="form"
              @submit.prevent="onAddChild"
            >
              <h2>Add child</h2>
              <label>
                Child name
                <input
                  v-model="childName"
                  type="text"
                  placeholder="Child name"
                  required
                >
              </label>
              <label>
                Birthdate
                <input
                  v-model="childBirthdate"
                  type="date"
                  required
                >
              </label>
              <button
                class="btn"
                type="submit"
                :disabled="loading || needsProfile"
              >
                Add child
              </button>
            </form>
          </div>
        </section>
      </aside>
    </section>

    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <p
      v-if="profileNotice"
      class="notice-page"
    >
      {{ profileNotice }}
    </p>
  </main>
</template>

<script setup lang="ts">
type Child = {
  child_id: string
  name: string
  birthdate: string
  status?: string
}

type Assignment = {
  status: string
}

type HttpError = {
  statusCode?: number
  data?: { detail?: string }
}

const children = ref<Child[]>([])
const loading = ref(false)
const error = ref('')
const profileNotice = ref('')
const needsProfile = ref(false)
const activeAssignmentsCount = ref<number | null>(null)

const userName = ref('')
const childName = ref('')
const childBirthdate = ref('')

const normalizedStatus = (child: Child): string => String(child.status || 'active').toLowerCase()

const activeChildren = computed(() => children.value.filter(child => normalizedStatus(child) !== 'archived'))
const archivedChildren = computed(() => children.value.filter(child => normalizedStatus(child) === 'archived'))

const activeAssignmentsLabel = computed(() => {
  if (needsProfile.value) return '—'
  return activeAssignmentsCount.value === null ? 'n/a' : String(activeAssignmentsCount.value)
})

const loadAssignmentsSummary = async () => {
  if (!activeChildren.value.length) {
    activeAssignmentsCount.value = 0
    return
  }

  const results = await Promise.allSettled(
    activeChildren.value.map(child => $fetch<Assignment[]>(`/api/assignments?childId=${encodeURIComponent(child.child_id)}`))
  )

  let total = 0
  let failed = false

  for (const item of results) {
    if (item.status === 'rejected') {
      failed = true
      continue
    }

    for (const assignment of item.value) {
      const status = String(assignment.status || '').toLowerCase()
      if (status === 'assigned' || status === 'started') {
        total += 1
      }
    }
  }

  activeAssignmentsCount.value = failed ? null : total
}

const loadChildren = async () => {
  error.value = ''
  profileNotice.value = ''
  loading.value = true
  try {
    children.value = await $fetch('/api/children')
    needsProfile.value = false
    await loadAssignmentsSummary()
  } catch (err: unknown) {
    const e = err as HttpError
    activeAssignmentsCount.value = null
    if (e.statusCode === 404) {
      needsProfile.value = true
      profileNotice.value = 'Finish profile setup to start adding children.'
      children.value = []
    } else if (e.statusCode === 503) {
      error.value = 'User-children service is unavailable. Try again in a moment.'
      children.value = []
      needsProfile.value = false
    } else {
      error.value = e.data?.detail || 'Failed to load children'
      needsProfile.value = false
    }
  } finally {
    loading.value = false
  }
}

const onCreateUser = async () => {
  error.value = ''
  loading.value = true
  try {
    const result = await $fetch<{ alreadyExists?: boolean }>('/api/user/create', {
      method: 'POST',
      body: { name: userName.value }
    })
    if (result?.alreadyExists) {
      profileNotice.value = 'Profile already exists.'
    }
    needsProfile.value = false
    userName.value = ''
    await loadChildren()
  } catch (err: unknown) {
    error.value = (err as HttpError).data?.detail || 'Failed to create user'
  } finally {
    loading.value = false
  }
}

const onAddChild = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/children', {
      method: 'POST',
      body: { name: childName.value, birthdate: childBirthdate.value }
    })
    childName.value = ''
    childBirthdate.value = ''
    await loadChildren()
  } catch (err: unknown) {
    error.value = (err as HttpError).data?.detail || 'Failed to add child'
  } finally {
    loading.value = false
  }
}

const removeChild = async (childId: string) => {
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/children/${childId}`, { method: 'DELETE' })
    await loadChildren()
  } catch (err: unknown) {
    error.value = (err as HttpError).data?.detail || 'Failed to archive child'
  } finally {
    loading.value = false
  }
}

const restoreChild = async (childId: string) => {
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/children/${childId}/restore`, { method: 'POST' })
    await loadChildren()
  } catch (err: unknown) {
    error.value = (err as HttpError).data?.detail || 'Failed to restore child'
  } finally {
    loading.value = false
  }
}

onMounted(loadChildren)
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

.stats-grid {
  max-width: 1120px;
  margin: 0 auto 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.stats-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.stats-card p {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stats-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.2rem;
}

.layout-grid {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
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

.card h2 {
  margin: 0;
}

.child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
}

.child:last-of-type {
  margin-bottom: 0;
}

.child h3 {
  margin: 0;
}

.child p {
  margin: 4px 0 0;
  color: var(--muted);
}

.child--archived {
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

details summary {
  cursor: pointer;
  font-weight: 700;
}

.archived-list {
  margin-top: 10px;
}

.card--sticky {
  position: sticky;
  top: 84px;
}

.stack {
  display: grid;
  gap: 14px;
}

.sep {
  border: 0;
  border-top: 1px solid var(--border);
}

.form {
  display: grid;
  gap: 10px;
}

label {
  display: grid;
  gap: 6px;
  color: var(--text);
  font-size: 0.9rem;
}

input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  background: var(--panel);
  color: var(--text);
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
}

.btn--ghost {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
}

.notice {
  margin: 0;
  color: #166534;
  font-weight: 600;
}

.muted {
  color: var(--muted);
}

.error,
.notice-page {
  max-width: 1120px;
  margin: 16px auto 0;
}

.error {
  color: #b91c1c;
}

.notice-page {
  color: #166534;
}

@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .card--sticky {
    position: static;
  }

  .child {
    align-items: flex-start;
    flex-direction: column;
  }
}

:global(.dark) .btn {
  background: #2563eb;
  color: #e5e7eb;
}
