import { findExecutable } from "./launcher.js"
import { createCodexHistoryLoader } from "./codex-session-history.js"
import { createOmpHistoryLoader } from "./omp-session-history.js"
import { OMP_EXTENSION_ACTION_PROVIDERS } from "./extension-actions.js"

const COMMON_CAPABILITIES = {
  sessions: true,
  prompt: true,
  abort: true,
  streaming: true,
  agents: false,
  diff: false,
  filesystemBrowser: true,
  questions: false,
  permissions: false,
  sessionRename: false,
  sessionDelete: false
}

export const SUPRU_AI_PROFILES = {
  omp: {
    id: "omp",
    label: "Oh My Pi",
    command: "omp",
    args: ["acp"],
    permissionMode: "allow",
    historyLoader: createOmpHistoryLoader(),
    capabilities: {
      ...COMMON_CAPABILITIES,
      models: true,
      todos: true,
      commands: true,
      actions: true,
      sessionRename: true,
      sessionDelete: true
    },
    actionProviders: OMP_EXTENSION_ACTION_PROVIDERS
  },
  pi: {
    id: "pi",
    label: "PI",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["-y", "@automatalabs/pi-acp@0.2.5"],
    adapterCommand: "pi-acp",
    permissionMode: "allow",
    preserveListedTimestamps: true,
    reloadOnHistoryRefresh: false,
    capabilities: {
      ...COMMON_CAPABILITIES,
      models: true,
      todos: false,
      commands: true,
      actions: false,
      sessionRename: true,
      sessionDelete: true
    }
  },
  claude: {
    id: "claude",
    label: "Claude Code",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["-y", "@agentclientprotocol/claude-agent-acp@0.63.0"],
    adapterCommand: "claude-agent-acp",
    permissionMode: "allow",
    preserveListedTimestamps: true,
    reloadOnHistoryRefresh: false,
    capabilities: {
      ...COMMON_CAPABILITIES,
      models: true,
      todos: true,
      commands: false,
      actions: false,
      sessionRename: true,
      sessionDelete: true
    }
  },
  codex: {
    id: "codex",
    label: "Codex CLI",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["-y", "@agentclientprotocol/codex-acp@1.1.14"],
    adapterCommand: "codex-acp",
    permissionMode: "allow",
    authMethod: "chat-gpt",
    historyLoader: createCodexHistoryLoader(),
    preserveListedTimestamps: true,
    reloadOnHistoryRefresh: false,
    capabilities: {
      ...COMMON_CAPABILITIES,
      models: true,
      todos: true,
      commands: true,
      actions: false,
      sessionRename: true,
      sessionDelete: true
    }
  }
}

export function supruAiProfile(id) {
  const profile = SUPRU_AI_PROFILES[id]
  if (!profile) throw new Error(`Unsupported backend: ${id}`)
  return profile
}

/**
 * The agent CLI and its ACP adapter are two different installations. An adapter already on PATH
 * is preferred over fetching one so startup avoids a network round trip and works in restricted
 * environments.
 */
export function resolveAcpLaunch(profile, { find = findExecutable } = {}) {
  if (!profile.adapterCommand) return { command: profile.command, args: [...profile.args], source: "direct" }
  const installed = find(profile.adapterCommand)
  if (installed) return { command: installed, args: [], source: "path" }
  return { command: profile.command, args: [...profile.args], source: "npx" }
}
