export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/children')) return

  if (import.meta.server) {
    const token = useCookie('access_token')
    if (!token.value) {
      return navigateTo('/login')
    }
    return
  }

  try {
    await $fetch('/api/me')
  } catch (err: any) {
    if (err?.statusCode === 401 || err?.statusCode === 403) {
      return navigateTo('/login')
    }
    return
  }
})
