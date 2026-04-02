// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },

  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@sidebase/nuxt-auth',
  ],

  auth: {
    baseURL: process.env.AUTH_ORIGIN
      ? `${process.env.AUTH_ORIGIN}/api/auth`
      : '/api/auth',
    provider: {
      type: 'authjs',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    authSecret: process.env.AUTH_SECRET,
  },
})
