// https://nuxt.com/docs/api/configuration/nuxt-config
// Minimal process env typing to avoid @types/node dependency in restricted environments.
declare const process: { env: Record<string, string | undefined> }
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  runtimeConfig: {
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
    userChildrenServiceUrl: process.env.USER_CHILDREN_SERVICE_URL || 'http://localhost:8001',
    accessCookieName: process.env.ACCESS_COOKIE_NAME || 'access_token',
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refresh_token',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
    public: {
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
