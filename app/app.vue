<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en' }
})

const title = 'User Portal'
const description = 'Secure access to your children and stories.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})

const authState = useState('auth', () => ({
  isAuthed: false
}))

onMounted(async () => {
  try {
    await $fetch('/api/me')
    authState.value.isAuthed = true
  } catch {
    authState.value.isAuthed = false
  }
})

const signOut = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  authState.value.isAuthed = false
  await navigateTo('/login')
}
</script>

<template>
  <UApp>
    <div class="app-shell">
      <header class="topbar">
        <NuxtLink
          :to="authState.isAuthed ? '/children' : '/login'"
          class="brand"
        >
          <span class="brand__title">User Portal</span>
          <span class="brand__subtitle">Parent workspace</span>
        </NuxtLink>
        <nav class="nav">
          <NuxtLink
            v-if="!authState.isAuthed"
            to="/login"
            class="nav-link"
          >Login</NuxtLink>
          <NuxtLink
            v-if="authState.isAuthed"
            to="/settings"
            class="nav-link"
          >
            Settings
          </NuxtLink>
          <button
            v-if="authState.isAuthed"
            class="nav-link btn-link"
            @click="signOut"
          >
            Sign out
          </button>
        </nav>
      </header>
      <UMain class="main">
        <NuxtPage />
      </UMain>
    </div>
  </UApp>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(52, 211, 153, 0.08) 0%, rgba(52, 211, 153, 0) 180px),
    var(--bg);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand {
  display: grid;
  text-decoration: none;
}

.brand__title {
  font-weight: 700;
  color: var(--text);
}

.brand__subtitle {
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.nav {
  display: flex;
  gap: 10px;
  align-items: center;
}
.nav-link {
  text-decoration: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--panel);
}
.btn-link {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}
.main {
  padding: 0;
}
</style>
