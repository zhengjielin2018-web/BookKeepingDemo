// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },

  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@sidebase/nuxt-auth',
  ],

  auth: {
    baseURL: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth`,
    provider: {
      type: 'authjs',
      trustHost: true,
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
    public: {
      appVersion: pkg.version,
    },
  },
})
