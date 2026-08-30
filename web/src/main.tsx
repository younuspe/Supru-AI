import React from "react"
import ReactDOM from "react-dom/client"
import { Capacitor } from "@capacitor/core"
import App from "./App"
import { ErrorBoundary } from "./ErrorBoundary"
import { SERVER_STORAGE_KEYS } from "./storageKeys"
import { api } from "./api"
import { loadActiveServerProfile, loadServerProfiles } from "./serverProfiles"
import "./styles.css"
import "./supru-theme.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary resetKeys={SERVER_STORAGE_KEYS}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

const wireSupruWelcome = () => {
  const welcome = document.getElementById("supru-welcome")
  const connectButton = document.getElementById("supru-connect")
  const status = document.getElementById("supru-status")
  if (!welcome || !connectButton || !status) return

  let connected = false

  const connect = async () => {
    status.textContent = "Connecting to Supru…"
    connectButton.setAttribute("disabled", "true")
    try {
      const profiles = loadServerProfiles()
      const profile = loadActiveServerProfile(profiles)
      if (!profile || !profile.config.host.trim()) {
        throw new Error("No server or bridge is configured yet.")
      }

      await api.health(profile.config)
      connected = true
      document.documentElement.dataset.supruState = "connected"
      welcome.classList.add("is-connected")
      status.textContent = "Supru is awake."
      connectButton.textContent = "Disconnect"
      connectButton.removeAttribute("disabled")
      window.dispatchEvent(new CustomEvent("supru:connected", {
        detail: { profileId: profile.id, backend: profile.config.backend }
      }))
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Supru could not reach the bridge."
      connectButton.removeAttribute("disabled")
      connectButton.textContent = "Connect"
    }
  }

  const disconnect = () => {
    connected = false
    document.documentElement.dataset.supruState = "waiting"
    welcome.classList.remove("is-connected")
    status.textContent = "Supru is waiting… curious."
    connectButton.textContent = "Connect"
    window.dispatchEvent(new CustomEvent("supru:disconnected"))
  }

  connectButton.addEventListener("click", () => {
    if (connected) disconnect()
    else void connect()
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireSupruWelcome, { once: true })
} else {
  wireSupruWelcome()
}

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && !window.supruDesktop?.platform.isDesktop && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
  })
}
