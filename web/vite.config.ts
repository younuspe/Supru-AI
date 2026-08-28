import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "desktop" ? "./" : "/Supru-AI/",
  build: {
    cssMinify: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        // The packaged Electron renderer is local file:// content. Keeping
        // the renderer in one module removes the class of failures where a
        // stale/source TypeScript module URL is requested at runtime.
        inlineDynamicImports: mode === "desktop"
      }
    }
  }
}))
