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

    <section class="list">
      <article
        v-for="item in assignments"
        :key="item.assignment_id"
        class="card"
      >
        <div>
          <h3>{{ item.test_title || `Test ${item.test_id}` }}</h3>
          <p>Status: {{ item.status }}</p>
        </div>
        <button
          class="btn"
          :disabled="loading"
          @click="start(item)"
        >
          Start
        </button>
      </article>
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
}

const route = useRoute()
const childId = computed(() => String(route.params.childId || ''))

const assignments = ref<AssignmentItem[]>([])
const loading = ref(false)
const error = ref('')

const load = async () => {
  error.value = ''
  loading.value = true
  try {
    assignments.value = await $fetch<AssignmentItem[]>(
      `/api/assignments?childId=${encodeURIComponent(childId.value)}`
    )
  } catch (err: unknown) {
    const message
      = typeof err === 'object' && err !== null && 'data' in err
        ? String(
            ((err as { data?: { detail?: string } }).data?.detail
              ?? 'Failed to load assignments')
          )
        : 'Failed to load assignments'
    error.value = message
  } finally {
    loading.value = false
  }
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
      `/attempts/${res.attempt_id}?testId=${item.test_id}&childId=${childId.value}`
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

onMounted(load)
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
.list {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 12px;
}
.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
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
