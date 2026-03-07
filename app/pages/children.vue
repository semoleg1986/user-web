<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">
          Children
        </p>
        <h1>Your children</h1>
      </div>
      <button
        class="btn btn--ghost"
        :disabled="loading"
        @click="loadChildren"
      >
        Refresh
      </button>
    </header>

    <section class="card">
      <form
        class="form"
        @submit.prevent="onCreateUser"
      >
        <h3>Create user profile</h3>
        <div class="row">
          <input
            v-model="userName"
            type="text"
            placeholder="Your name"
            required
          >
          <button
            class="btn"
            type="submit"
            :disabled="loading"
          >
            Create
          </button>
        </div>
      </form>

      <form
        class="form"
        @submit.prevent="onAddChild"
      >
        <h3>Add child</h3>
        <div class="grid">
          <input
            v-model="childName"
            type="text"
            placeholder="Child name"
            required
          >
          <input
            v-model="childBirthdate"
            type="date"
            required
          >
        </div>
        <button
          class="btn"
          type="submit"
          :disabled="loading"
        >
          Add child
        </button>
      </form>
    </section>

    <section class="list">
      <article
        v-for="child in children"
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
            :to="`/assignments/${child.child_id}`"
          >
            Assignments
          </NuxtLink>
          <button
            class="btn btn--ghost"
            @click="removeChild(child.child_id)"
          >
            Delete
          </button>
        </div>
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
type Child = {
  child_id: string
  name: string
  birthdate: string
}

type HttpError = {
  statusCode?: number
  data?: { detail?: string }
}

const children = ref<Child[]>([])
const loading = ref(false)
const error = ref('')

const userName = ref('')
const childName = ref('')
const childBirthdate = ref('')

const loadChildren = async () => {
  error.value = ''
  loading.value = true
  try {
    children.value = await $fetch('/api/children')
  } catch (err: unknown) {
    const e = err as HttpError
    if (e.statusCode === 404) {
      error.value = 'User profile not found. Create your profile first.'
      children.value = []
    } else if (e.statusCode === 503) {
      error.value = 'User-children service is unavailable. Try again in a moment.'
      children.value = []
    } else {
      error.value = e.data?.detail || 'Failed to load children'
    }
  } finally {
    loading.value = false
  }
}

const onCreateUser = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/user/create', {
      method: 'POST',
      body: { name: userName.value }
    })
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
    error.value = (err as HttpError).data?.detail || 'Failed to remove child'
  } finally {
    loading.value = false
  }
}

onMounted(loadChildren)
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
  margin: 0 auto 30px;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  display: grid;
  gap: 20px;
}
.form h3 {
  margin: 0 0 12px;
}
.row {
  display: flex;
  gap: 12px;
}
.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
input {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
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
}
.list {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 12px;
}
.child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
}
.actions {
  display: flex;
  gap: 8px;
}
.error {
  max-width: 900px;
  margin: 20px auto 0;
  color: #b91c1c;
}
</style>
