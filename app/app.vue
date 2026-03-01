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
        <NuxtLink :to="authState.isAuthed ? '/children' : '/login'" class="brand">User Portal</NuxtLink>
        <nav class="nav">
          <NuxtLink v-if="!authState.isAuthed" to="/login" class="nav-link">Login</NuxtLink>
          <button v-if="authState.isAuthed" class="nav-link btn-link" @click="signOut">Sign out</button>
          <UColorModeButton />
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
  background: var(--ui-background);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  font-weight: 700;
  text-decoration: none;
  color: var(--ui-text);
}
.nav {
  display: flex;
  gap: 12px;
  align-items: center;
}
.nav-link {
  text-decoration: none;
  color: var(--ui-text-muted);
  font-weight: 600;
}
.btn-link {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}
.nav-link:hover {
  color: var(--ui-text);
}
.main {
  padding: 0;
}
</style>
