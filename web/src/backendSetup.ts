import type { BackendKind } from "./types"

/** Declaration order everywhere a harness has to be listed. */
export const BACKEND_KINDS: BackendKind[] = ["opencode", "omp", "pi", "claude", "codex"]

export function backendDisplayName(backend: BackendKind): string {
  if (backend === "omp") return "Oh My Pi"
  if (backend === "pi") return "PI"
  if (backend === "claude") return "Claude Code"
  if (backend === "codex") return "Codex CLI"
  return "OpenCode"
}

export function isBridgeBackend(backend: BackendKind): boolean {
  return backend === "omp" || backend === "pi" || backend === "claude" || backend === "codex"
}

export function backendDefaultPort(backend: BackendKind): number {
  return backend === "opencode" ? 4096 : 4097
}

/** Phase 1 intentionally has no login/security fields. */
export function backendDefaultUsername(_backend: BackendKind): string {
  return ""
}

export function backendDocsAnchor(backend: BackendKind): string {
  if (backend === "pi") return "pi-bridge-setup"
  if (backend === "claude") return "claude-code-bridge-setup"
  if (backend === "codex") return "codex-bridge-setup"
  if (backend === "omp") return "oh-my-pi-bridge-setup"
  return "opencode-server-setup"
}

/**
 * Phase 1 connection command: deliberately no username, password, token, or other security setup.
 * Authentication can be added later once the basic cross-platform connection is proven.
 */
export function backendSetupCommand(
  backend: BackendKind,
  options: { port?: number; username?: string; password?: string } = {}
): string {
  const port = options.port && options.port > 0 ? options.port : backendDefaultPort(backend)
  if (backend === "opencode") {
    return `npx -y opencode-ai serve --hostname 0.0.0.0 --port ${port}`
  }
  return [
    `npx --yes ./bridge --backend ${backend} \\`,
    `  --host 0.0.0.0 --port ${port} \\`,
    `  --root "$PWD"`
  ].join("\n")
}
