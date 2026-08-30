import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "ai.harness.remote",
  appName: "Supru AI",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true
  }
}

export default config
