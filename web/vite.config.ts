import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repository as /Supru-AI/.
  base: "/Supru-AI/",
  // Vite 8 exposes CSS minification under build.cssMinify.
  // Keep the Supru theme bundle unminified until the Lightning CSS parser
  // accepts the combined theme stylesheet reliably.
  build: {
    cssMinify: false
  }
})
