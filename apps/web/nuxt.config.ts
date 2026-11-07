// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE in .env.
      apiBase: 'http://localhost:3001/api',
    },
  },
  // Dashboards are private and per-user, so render them in the browser only.
  // Public pages (home, and the shop in phase 2) keep server rendering for SEO.
  routeRules: {
    '/admin/**': { ssr: false },
    '/company/**': { ssr: false },
    '/courier/**': { ssr: false },
    '/account/**': { ssr: false },
  },
  app: {
    head: {
      title: 'Iwear',
      meta: [{ name: 'description', content: 'Try clothes on virtually and get them delivered.' }],
    },
  },
});
