import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Where the built site will be served from, and it is three different
  // places:
  //
  //   BASE_PATH set   → exactly that. Per-PR previews use it, because each one
  //                     lives at its own /preview/pr-<n>/ folder and the base
  //                     has to match or every asset 404s.
  //   GH_PAGES=true   → /aims-os-design-system/, the published site.
  //   neither         → "/", a dev server or a root-served host.
  //
  // BASE_PATH wins on purpose: it is the explicit one, and a caller that sets
  // it has a specific path in mind that no default can guess.
  base: process.env.BASE_PATH || (process.env.GH_PAGES ? "/aims-os-design-system/" : "/"),
  plugins: [react()],
  // Honour PORT so several dev servers can run at once (one per Claude Code
  // chat, one per worktree). Unset → Vite's own default, so running
  // `npm run dev` by hand behaves exactly as before.
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
