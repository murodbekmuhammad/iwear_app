import { fileURLToPath } from 'node:url';

// https://nuxt.com/docs/api/configuration/nuxt-config

// STATIC_SITE=1 builds a browser-only site for static hosts such as GitHub Pages
// (see .github/workflows/pages.yml). Normal builds keep server rendering.
const staticSite = process.env.STATIC_SITE === '1';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: !staticSite,
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  // Body-tracking runtime for the camera try-on, copied from node_modules by scripts/copy-mediapipe.mjs.
  nitro: {
    publicAssets: [{ dir: fileURLToPath(new URL('./.mediapipe', import.meta.url)), baseURL: '/mediapipe', maxAge: 60 * 60 * 24 * 30 }],
  },
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE in .env.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/api',
    },
  },
  // Dashboards are private and per-user, so render them in the browser only.
  // Public pages (home, and the shop in phase 2) keep server rendering for SEO.
  routeRules: {
    '/admin/**': { ssr: false },
    '/company/**': { ssr: false },
    '/courier/**': { ssr: false },
    '/account/**': { ssr: false },
    // The camera only exists in the browser.
    '/try-on': { ssr: false },
  },
  app: {
    head: {
      title: 'Iwear',
      meta: [{ name: 'description', content: 'Try clothes on virtually and get them delivered.' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
});
