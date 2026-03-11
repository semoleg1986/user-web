<template>
  <main class="page">
    <section class="card">
      <header class="card__header">
        <div>
          <p class="eyebrow">
            System
          </p>
          <h1>Settings</h1>
        </div>
        <span
          class="badge"
          :class="isProdLike ? 'badge--prod' : 'badge--dev'"
        >
          {{ isProdLike ? 'prod-like' : 'dev/local' }}
        </span>
      </header>

      <dl class="env-list">
        <div>
          <dt>Public Base URL</dt>
          <dd>{{ publicBaseUrl }}</dd>
        </div>
        <div>
          <dt>Auth API</dt>
          <dd>{{ authServiceUrl }}</dd>
        </div>
        <div>
          <dt>User/Children API</dt>
          <dd>{{ userChildrenServiceUrl }}</dd>
        </div>
        <div>
          <dt>Assessment API</dt>
          <dd>{{ assessmentServiceUrl }}</dd>
        </div>
      </dl>

      <section class="theme">
        <h2>Theme</h2>
        <p class="theme__hint">
          Default is system. You can override it here.
        </p>
        <div class="theme__actions">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            class="theme__button"
            :class="{ 'theme__button--active': colorMode.preference === option.value }"
            @click="setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="theme__meta">
          active: {{ colorMode.value }}
        </p>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const colorMode = useColorMode()

const publicBaseUrl = String(config.public.baseUrl || '')
const authServiceUrl = String(config.authServiceUrl || '')
const userChildrenServiceUrl = String(config.userChildrenServiceUrl || '')
const assessmentServiceUrl = String(config.assessmentServiceUrl || '')

const isProdLike = computed(() => !publicBaseUrl.includes('localhost'))

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
] as const

const setTheme = (value: 'system' | 'light' | 'dark') => {
  colorMode.preference = value
}
</script>

<style scoped>
.page {
  min-height: calc(100vh - 72px);
  padding: 28px 20px 60px;
}

.card {
  max-width: 980px;
  margin: 0 auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0 0 4px;
}

h1 {
  margin: 0;
}

.badge {
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge--prod {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.badge--dev {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.env-list {
  margin: 18px 0 0;
  display: grid;
  gap: 12px;
}

.env-list div {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

dd {
  margin: 8px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}

.theme {
  margin-top: 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
}

.theme h2 {
  margin: 0;
}

.theme__hint {
  margin: 8px 0 0;
  color: var(--muted);
}

.theme__actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.theme__button {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  color: var(--text);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}

.theme__button--active {
  background: color-mix(in srgb, #22c55e 18%, var(--panel));
  border-color: color-mix(in srgb, #22c55e 60%, var(--border));
}

.theme__meta {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
