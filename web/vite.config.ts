import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repository as /Supru-AI/.
  // Keep Vite's generated asset URLs valid for the cross-platform web app.
  base: "/Supru-AI/"
})
