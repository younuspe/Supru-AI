import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "ai.harness.remote",
  appName: "Harness Remote",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true
  }
}

export default config
