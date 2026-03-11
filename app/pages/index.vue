<template>
  <main class="page">
    <section class="splash">
      <p class="eyebrow">
        User Portal
      </p>
      <h1>Redirecting…</h1>
      <p class="subtitle">
        Taking you to login.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
onMounted(async () => {
  try {
    await $fetch('/api/me')
    await navigateTo('/children')
    return
  } catch {
    // no-op
  }

  await navigateTo('/login')
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    linear-gradient(180deg, rgba(52, 211, 153, 0.08) 0%, rgba(52, 211, 153, 0) 180px),
    var(--bg);
  color: var(--text);
  padding: 24px;
}
.splash {
  text-align: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: var(--muted);
}
.subtitle {
  color: var(--muted);
}
</style>
