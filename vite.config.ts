import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { gravewakeSwPlugin } from "./scripts/gravewake-sw-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { gravewakePagesPlugin } from "./scripts/gravewake-pages-plugin.mjs";

// playtest2b (2026-10-17, Play Store cleanup): the template's PGLite bootstrap, /auth/popup middleware and /__app-env
// plugin are gone with the sign-in code; the game has no server, database or accounts.

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  // pages1: GRAVEWAKE_BASE=/gravewake/ builds for a GitHub Pages subpath; unset, the site root as before.
  base: process.env.GRAVEWAKE_BASE || "/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    // install1: emits sw.js (offline precache, versioned by build hash) in the client build only.
    // pages1: public-file paths in the game code follow GRAVEWAKE_BASE (no-op at "/").
    gravewakePagesPlugin(),
    gravewakeSwPlugin(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
