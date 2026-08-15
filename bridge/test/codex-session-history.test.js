import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { createCodexHistoryLoader } from "../src/codex-session-history.js"

const sessionID = "019fdb8d-c519-7cf3-8226-ae4a312d7b45"

async function writeRollout(records) {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-codex-history-"))
  const nested = path.join(root, "2026", "08", "07")
  await mkdir(nested, { recursive: true })
  await writeFile(
    path.join(nested, `rollout-2026-08-07T11-28-49-${sessionID}.jsonl`),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`
  )
  return root
}

test("reads a Codex rollout as the conversation the user saw", async () => {
  // Codex writes both the turns the user saw (`event_msg`) and everything it fed the model
  // (`response_item`). The latter carries AGENTS.md and the desktop app's context blocks under the
  // `user` role, which would otherwise be shown as if the user had typed them.
  const root = await writeRollout([
    { timestamp: "2026-08-07T09:28:49.000Z", type: "session_meta", payload: { session_id: sessionID, cwd: "C:\\Software\\OCApp" } },
    { timestamp: "2026-08-07T09:28:50.000Z", type: "response_item", payload: { type: "message", role: "developer", content: [{ type: "input_text", text: "<app-context>desktop</app-context>" }] } },
    { timestamp: "2026-08-07T09:28:50.500Z", type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "# AGENTS.md instructions" }] } },
    { timestamp: "2026-08-07T09:28:51.290Z", type: "event_msg", payload: { type: "user_message", message: "Restyling dell'app", images: [] } },
    { timestamp: "2026-08-07T09:28:55.000Z", type: "event_msg", payload: { type: "agent_reasoning", text: "**Planning the restyle**" } },
    { timestamp: "2026-08-07T09:28:57.136Z", type: "event_msg", payload: { type: "agent_message", message: "Riprendo il restyling", phase: "commentary" } },
    { timestamp: "2026-08-07T09:29:00.000Z", type: "event_msg", payload: { type: "token_count", info: {} } },
    { timestamp: "2026-08-07T09:29:10.000Z", type: "event_msg", payload: { type: "agent_message", message: "Fatto", phase: "final" } }
  ])

  try {
    const messages = await createCodexHistoryLoader(root)(sessionID)
    assert.deepEqual(
      messages.map((message) => [message.info.role, message.parts[0].type, message.parts[0].text]),
      [
        ["user", "text", "Restyling dell'app"],
        ["assistant", "reasoning", "**Planning the restyle**"],
        ["assistant", "text", "Riprendo il restyling"],
        ["assistant", "text", "Fatto"]
      ],
      "instruction blocks and bookkeeping events must stay out of the transcript"
    )
    assert.equal(messages[0].info.time.created, Date.parse("2026-08-07T09:28:51.290Z"))
    assert.equal(new Set(messages.map((message) => message.info.id)).size, messages.length, "ids must be unique")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("keeps message ids stable as a Codex rollout grows", async () => {
  // A rollout is append-only and re-read on every refresh, so an id derived from the position of a
  // record has to survive later turns being appended — otherwise each refresh would replace the
  // whole transcript rather than extend it.
  const first = { timestamp: "2026-08-07T09:28:51.290Z", type: "event_msg", payload: { type: "user_message", message: "Prima" } }
  const second = { timestamp: "2026-08-07T09:29:51.290Z", type: "event_msg", payload: { type: "agent_message", message: "Seconda" } }
  const root = await writeRollout([first])
  const grown = await writeRollout([first, second])

  try {
    const before = await createCodexHistoryLoader(root)(sessionID)
    const after = await createCodexHistoryLoader(grown)(sessionID)
    assert.equal(after.length, 2)
    assert.equal(after[0].info.id, before[0].info.id)
    assert.equal(after[0].parts[0].id, before[0].parts[0].id)
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(grown, { recursive: true, force: true })
  }
})

test("reports no history rather than failing when a rollout is absent", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-codex-history-"))
  try {
    const loadHistory = createCodexHistoryLoader(root)
    assert.deepEqual(await loadHistory(sessionID), [])
    assert.deepEqual(await loadHistory("../escape"), [], "a session id must not be able to walk the filesystem")
    assert.deepEqual(await createCodexHistoryLoader(path.join(root, "missing"))(sessionID), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
