import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "desktop" ? "./" : "/Supru-AI/",
  build: {
    cssMinify: false,
    emptyOutDir: true,
    // Desktop production must contain real JavaScript chunks. Keep the output naming
    // deterministic so Electron never receives a source-module extension in a runtime URL.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js"
      }
    }
  }
}))
