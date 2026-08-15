import { createReadStream } from "node:fs"
import { readdir } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { createInterface } from "node:readline"

/**
 * Codex allows a single writer per thread and takes the lock for the whole time a client holds the
 * thread open, so `session/load` answers "thread <id> already has an active writer" for every
 * session the Codex desktop app or a `codex` CLI is sitting on — which is precisely the sessions a
 * user wants to look at from their phone. Reading the rollout the harness already wrote takes no
 * lock, so those sessions can be shown even while Codex itself owns them.
 *
 * The transcript comes from the `event_msg` records rather than the `response_item` ones: only the
 * former carry what the user actually saw. The latter also hold the instruction blocks Codex feeds
 * the model — AGENTS.md, the plugin list, the desktop app context — under the `user` role, which
 * would surface as the user's own turns.
 */
export function createCodexHistoryLoader(sessionRoot = path.join(homedir(), ".codex", "sessions")) {
  const sessionFiles = new Map()

  async function locateSession(sessionID) {
    const known = sessionFiles.get(sessionID)
    if (known) return known
    if (!/^[A-Za-z0-9_-]+$/.test(sessionID)) return undefined
    try {
      // Rollouts are filed under sessions/<year>/<month>/<day>/rollout-<timestamp>-<id>.jsonl.
      const suffix = `-${sessionID}.jsonl`
      const entries = await readdir(sessionRoot, { recursive: true, withFileTypes: true })
      const entry = entries.find((candidate) => candidate.isFile() && candidate.name.endsWith(suffix))
      if (!entry) return undefined
      const file = path.join(entry.parentPath ?? entry.path, entry.name)
      sessionFiles.set(sessionID, file)
      return file
    } catch (error) {
      if (error?.code === "ENOENT") return undefined
      throw error
    }
  }

  return async function loadCodexHistory(sessionID) {
    const file = await locateSession(sessionID)
    if (!file) return []
    const messages = []
    const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
    let ordinal = 0
    for await (const line of lines) {
      ordinal += 1
      let record
      try {
        record = JSON.parse(line)
      } catch {
        continue
      }
      if (record?.type !== "event_msg") continue
      const payload = record.payload
      // A rollout is append-only, so the line number is a stable id across re-reads.
      const messageID = `${sessionID}:${ordinal}`
      const role = payload?.type === "user_message" ? "user"
        : payload?.type === "agent_message" || payload?.type === "agent_reasoning" ? "assistant"
        : undefined
      if (!role) continue
      // Reasoning is kept apart from spoken text so it renders collapsed, the way the replayed
      // transcript of a session this bridge owns already does.
      const type = payload.type === "agent_reasoning" ? "reasoning" : "text"
      const text = payload.type === "agent_reasoning" ? payload.text : payload.message
      if (typeof text !== "string" || !text) continue
      const created = Date.parse(record.timestamp ?? "")
      messages.push({
        info: {
          id: messageID,
          role,
          sessionID,
          time: { created: Number.isFinite(created) ? created : Date.now() }
        },
        parts: [{ id: `${messageID}:${type}:0`, messageID, type, text }]
      })
    }
    return messages
  }
}
