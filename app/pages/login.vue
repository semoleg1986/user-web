<template>
  <main class="page">
    <section class="card">
      <header>
        <p class="eyebrow">
          Auth
        </p>
        <h1>{{ mode === 'login' ? 'Login' : 'Register' }}</h1>
        <p class="subtitle">
          {{
            mode === 'login'
              ? 'Use your email or phone to sign in.'
              : 'Create an account to start adding children.'
          }}
        </p>
      </header>

      <div class="tabs">
        <button
          :class="['tab', mode === 'login' && 'active']"
          @click="switchMode('login')"
        >
          Login
        </button>
        <button
          :class="['tab', mode === 'register' && 'active']"
          @click="switchMode('register')"
        >
          Register
        </button>
      </div>

      <form
        class="form"
        @submit.prevent="mode === 'login' ? onLogin() : onRegister()"
      >
        <label>
          Identifier
          <input
            v-model="identifier"
            type="text"
            placeholder="email or phone"
            required
          >
        </label>
        <label>
          Password
          <input
            v-model="password"
            type="password"
            placeholder="••••••"
            required
          >
        </label>

        <label v-if="mode === 'register'">
          Your name
          <input
            v-model="displayName"
            type="text"
            placeholder="John Doe"
            minlength="2"
            maxlength="120"
            required
          >
        </label>

        <div
          v-if="mode === 'register'"
          class="hint"
        >
          We will create your profile immediately after registration.
        </div>

        <button
          class="btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register' }}
        </button>
      </form>

      <p
        v-if="notice"
        class="notice"
      >
        {{ notice }}
      </p>
      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>

      <div class="actions">
        <NuxtLink
          to="/children"
          class="link"
        >Go to children</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const mode = ref<'login' | 'register'>('login')
const identifier = ref('')
const password = ref('')
const displayName = ref('')
const loading = ref(false)
const error = ref('')
const notice = ref('')
const authState = useState('auth', () => ({
  isAuthed: false
}))

type ApiError = {
  data?: {
    detail?: string
  }
}

const getErrorDetail = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null) {
    const data = (err as ApiError).data
    if (typeof data?.detail === 'string' && data.detail) {
      return data.detail
    }
  }
  return fallback
}

const switchMode = (next: 'login' | 'register') => {
  mode.value = next
  error.value = ''
  notice.value = ''
}

const onRegister = async () => {
  error.value = ''
  loading.value = true
  try {
    notice.value = ''
    const name = displayName.value.trim()
    if (name.length < 2) {
      throw createError({ statusCode: 400, statusMessage: 'Name must be at least 2 characters' })
    }

    const body: Record<string, string> = { password: password.value }
    if (identifier.value.includes('@')) {
      body.email = identifier.value
    } else {
      body.phone = identifier.value
    }
    const reg = await $fetch<{ alreadyExists?: boolean }>('/api/auth/register', {
      method: 'POST',
      body
    })
    if (reg?.alreadyExists) {
      notice.value = 'Account already exists. Please sign in.'
      mode.value = 'login'
      return
    }
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { identifier: identifier.value, password: password.value }
    })
    try {
      await $fetch('/api/user/create', {
        method: 'POST',
        body: { name }
      })
    } catch {
      notice.value = 'Account created. Complete profile setup on the next screen.'
    }

    authState.value.isAuthed = true
    displayName.value = ''
    await navigateTo('/children')
  } catch (err: unknown) {
    error.value = getErrorDetail(err, 'Registration failed')
  } finally {
    loading.value = false
  }
}

const onLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { identifier: identifier.value, password: password.value }
    })
    authState.value.isAuthed = true
    await navigateTo('/children')
  } catch (err: unknown) {
    error.value = getErrorDetail(err, 'Login failed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.16), transparent 42%),
    radial-gradient(circle at 85% 85%, rgba(2, 132, 199, 0.12), transparent 44%),
    var(--bg);
  display: grid;
  place-items: center;
  padding: 20px;
}
.card {
  width: min(460px, 92vw);
  background: var(--panel);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: var(--muted);
}
.subtitle {
  color: var(--muted);
  margin-top: 6px;
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0 10px;
}
.tab {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}
.tab.active {
  background: color-mix(in srgb, #22c55e 18%, var(--panel));
  border-color: color-mix(in srgb, #22c55e 60%, var(--border));
}
.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--text);
}
input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  background: var(--panel);
  color: var(--text);
}
.hint {
  font-size: 0.85rem;
  color: var(--muted);
}
.btn {
  margin-top: 8px;
  background: #0f172a;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}
.error {
  margin-top: 12px;
  color: #b91c1c;
}
.notice {
  margin-top: 12px;
  color: #065f46;
}
.actions {
  margin-top: 16px;
}
.link {
  color: color-mix(in srgb, #22c55e 55%, var(--text));
  text-decoration: none;
}

:global(.dark) .btn {
  background: #2563eb;
  color: #e5e7eb;
}

:global(.dark) .page {
  background:
    radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.22), transparent 42%),
    radial-gradient(circle at 85% 85%, rgba(14, 165, 233, 0.16), transparent 44%),
    var(--bg);
}
</style>
