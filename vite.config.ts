import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],

  /**
   * GitHub Pages serves a project site from `/<repo>/`, not from the domain
   * root, so every built asset URL needs that prefix -- without it the page
   * loads and then asks for `/assets/index-*.js`, which 404s, and the result
   * is a blank screen with no visible error.
   *
   * Only the build is prefixed: `pnpm dev` stays on `/` so the dev server is
   * unaffected. `BASE_PATH` overrides it for a deployment under a different
   * repo name (or `/` for a user/organisation site).
   */
  base: command === 'build' ? (process.env.BASE_PATH ?? '/blog-was/') : '/',
}))
