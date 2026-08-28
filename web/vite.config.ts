import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages uses /Supru-AI/. The Electron renderer is loaded from
  // file:// inside the packaged app, so it must use relative asset URLs.
  base: mode === "desktop" ? "./" : "/Supru-AI/",
  build: {
    cssMinify: false,
    // Electron must never receive TypeScript source paths as runtime module
    // URLs. Keep every generated JavaScript chunk explicitly .js.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
}))
