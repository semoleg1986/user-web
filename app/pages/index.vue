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
onMounted(() => {
  navigateTo('/login')
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 20% 10%, #f1f4ff, #fff 40%, #fdf6f0 85%);
  color: #1f2937;
  padding: 24px;
}
.splash {
  text-align: center;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: #6b7280;
}
.subtitle {
  color: #6b7280;
}
</style>
