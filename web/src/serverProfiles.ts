import type { BackendKind, ServerConfig } from "./types"

/** Every server storage key lives here: the crash-recovery reset in storageKeys.ts composes them,
    and only this module reads or writes them. Keep this file free of runtime sibling imports so the
    node test runner, which cannot resolve extensionless specifiers, can load it directly. */
export const LEGACY_STORAGE_KEY = "opencode.remote.server"
export const ACTIVE_BACKEND_STORAGE_KEY = "opencode.remote.backend"
export const BACKEND_STORAGE_KEYS = {
  opencode: "opencode.remote.server.opencode",
  omp: "opencode.remote.server.omp",
  pi: "opencode.remote.server.pi",
  claude: "opencode.remote.server.claude",
  codex: "opencode.remote.server.codex"
} as const

export const SERVER_PROFILES_STORAGE_KEY = "opencode.remote.serverProfiles"
export const ACTIVE_PROFILE_STORAGE_KEY = "opencode.remote.activeServerProfile"

export type SavedServerProfile = {
  id: string
  name: string
  config: ServerConfig
}

const BACKENDS: BackendKind[] = ["opencode", "omp", "pi", "claude", "codex"]

function defaultConfig(backend: BackendKind): ServerConfig {
  return {
    backend,
    host: "",
    port: backend === "opencode" ? 4096 : 4097,
    username: backend === "opencode" ? "opencode" : backend,
    password: ""
  }
}

function bundledSupruBridgeProfile(): SavedServerProfile {
  return {
    id: "supru-local-bridge",
    name: "Supru local Bridge",
    config: {
      backend: "omp",
      host: "127.0.0.1",
      port: 4097,
      username: "",
      password: ""
    }
  }
}

function isUsableConfig(config: ServerConfig | null): config is ServerConfig {
  return !!config && typeof config.host === "string" && config.host.trim().length > 0 && Number.isFinite(config.port) && config.port > 0
}

function isBackend(value: unknown): value is BackendKind {
  return value === "opencode" || value === "omp" || value === "pi" || value === "claude" || value === "codex"
}

function parseConfig(value: unknown, fallbackBackend: BackendKind): ServerConfig | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ServerConfig>
  const backend = isBackend(candidate.backend) ? candidate.backend : fallbackBackend
  if (typeof candidate.host !== "string" || typeof candidate.port !== "number" || typeof candidate.username !== "string" || typeof candidate.password !== "string") return null
  const agentId = typeof candidate.agentId === "string" && candidate.agentId.trim() ? candidate.agentId.trim() : undefined
  return { ...defaultConfig(backend), ...candidate, backend, agentId }
}

function profileID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function profileName(backend: BackendKind, position: number): string {
  const label = backend === "omp" ? "Oh My Pi" : backend === "pi" ? "PI" : backend === "claude" ? "Claude Code" : backend === "codex" ? "Codex CLI" : "OpenCode"
  return position === 0 ? `${label} server` : `${label} server ${position + 1}`
}

function parseProfiles(value: string | null): SavedServerProfile[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const profiles = parsed.flatMap((candidate, index) => {
      if (!candidate || typeof candidate !== "object") return []
      const source = candidate as { id?: unknown; name?: unknown; config?: unknown }
      const config = parseConfig(source.config, "opencode")
      if (!config) return []
      return [{
        id: typeof source.id === "string" && source.id ? source.id : profileID(),
        name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : profileName(config.backend, index),
        config
      }]
    })
    return profiles.length > 0 ? profiles : null
  } catch {
    return null
  }
}

function legacyProfiles(): SavedServerProfile[] {
  const profiles: SavedServerProfile[] = []
  for (const backend of BACKENDS) {
    const raw = localStorage.getItem(BACKEND_STORAGE_KEYS[backend])
    if (!raw) continue
    try {
      const config = parseConfig(JSON.parse(raw), backend)
      if (isUsableConfig(config)) profiles.push({ id: profileID(), name: profileName(config.backend, profiles.length), config })
    } catch {
      // Ignore malformed old storage and continue with the remaining saved servers.
    }
  }
  if (profiles.length > 0) return profiles
  try {
    const legacy = parseConfig(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null"), "opencode")
    if (isUsableConfig(legacy)) return [{ id: profileID(), name: profileName(legacy.backend, 0), config: legacy }]
  } catch {
    // Fall through to the bundled Supru Bridge profile.
  }
  const backend = localStorage.getItem(ACTIVE_BACKEND_STORAGE_KEY)
  if (isBackend(backend)) {
    const config = defaultConfig(backend)
    if (isUsableConfig(config)) return [{ id: profileID(), name: profileName(backend, 0), config }]
  }
  return [bundledSupruBridgeProfile()]
}

export function loadServerProfiles(): SavedServerProfile[] {
  const parsed = parseProfiles(localStorage.getItem(SERVER_PROFILES_STORAGE_KEY))
  if (parsed && parsed.length > 0) {
    const usable = parsed.filter((profile) => isUsableConfig(profile.config))
    if (usable.length > 0) return usable
  }
  return legacyProfiles()
}

export function loadActiveServerProfile(profiles: SavedServerProfile[]): SavedServerProfile {
  const usable = profiles.filter((profile) => isUsableConfig(profile.config))
  const storedID = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
  return usable.find((profile) => profile.id === storedID) ?? usable.find((profile) => profile.id === "supru-local-bridge") ?? usable[0] ?? bundledSupruBridgeProfile()
}

export function persistServerProfiles(profiles: SavedServerProfile[], activeProfileID: string): void {
  localStorage.setItem(SERVER_PROFILES_STORAGE_KEY, JSON.stringify(profiles))
  localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeProfileID)
}

export function createServerProfile(name: string, backend: BackendKind): SavedServerProfile {
  return { id: profileID(), name: name.trim() || profileName(backend, 0), config: defaultConfig(backend) }
}
