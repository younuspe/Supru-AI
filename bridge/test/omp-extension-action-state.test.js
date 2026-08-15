import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { createOmpUndoRedoActionStateLoader } from "../src/omp-extension-action-state.js"

const sessionID = "session-1"
const sessionHash = createHash("sha256").update(sessionID).digest("hex")

test("normalizes the omp-undo-redo navigation store into authoritative action state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-omp-actions-"))
  const historyDirectory = path.join(root, "omp-undo-redo", "history")
  const statePath = path.join(historyDirectory, `${sessionHash}.json`)
  await mkdir(historyDirectory, { recursive: true })
  const loadState = createOmpUndoRedoActionStateLoader({
    runGit: async () => ({ stdout: `${root}\n` })
  })

  try {
    const checkpoints = [
      { kind: "session", parentLeafId: "user-1", leafId: "assistant-1" },
      { kind: "session", parentLeafId: "user-2", leafId: "assistant-2" }
    ]
    await writeFile(statePath, JSON.stringify({ schemaVersion: 1, sessionHash, checkpoints, currentIndex: 1 }))
    assert.deepEqual(await loadState({ sessionID, directory: root }), {
      actions: [{ id: "undo", enabled: true }, { id: "redo", enabled: false }],
      sessionRevision: "1:assistant-2",
      activeSessionLeaf: "assistant-2"
    })

    await writeFile(statePath, JSON.stringify({ schemaVersion: 1, sessionHash, checkpoints, currentIndex: 0 }))
    assert.deepEqual(await loadState({ sessionID, directory: root }), {
      actions: [{ id: "undo", enabled: true }, { id: "redo", enabled: true }],
      sessionRevision: "0:assistant-1",
      activeSessionLeaf: "assistant-1"
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("returns no authoritative state outside Git instead of synthesizing action availability", async () => {
  let calls = 0
  const loadState = createOmpUndoRedoActionStateLoader({
    runGit: async () => {
      calls += 1
      throw new Error("fatal: not a git repository")
    }
  })

  assert.equal(await loadState({ sessionID, directory: tmpdir() }), undefined)
  assert.equal(calls, 1)
})

test("loads authoritative runtime state for a non-Git ACP process", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-omp-runtime-"))
  const processID = 4242
  const runtimeDirectory = path.join(root, String(processID))
  const sessionsDirectory = path.join(runtimeDirectory, "sessions")
  await mkdir(sessionsDirectory, { recursive: true })
  await writeFile(path.join(runtimeDirectory, "runtime.json"), JSON.stringify({
    schemaVersion: 1,
    protocol: "omp-undo-redo/runtime",
    runtimeId: "runtime-1",
    pid: processID,
    startedAt: "2026-08-01T12:00:00.000Z"
  }))
  await writeFile(path.join(sessionsDirectory, `${sessionHash}.json`), JSON.stringify({
    schemaVersion: 2,
    protocol: "omp-undo-redo/action-state",
    sessionHash,
    runtimeId: "runtime-1",
    pid: processID,
    actions: [{ id: "undo", enabled: false }, { id: "redo", enabled: true }],
    sessionRevision: "runtime-revision-2",
    activeSessionLeaf: "user-1",
    actionResult: { id: "undo", applied: true, token: "runtime-action-1" }
  }))
  const loadState = createOmpUndoRedoActionStateLoader({
    runtimeRoot: root,
    runGit: async () => { throw new Error("fatal: not a git repository") }
  })

  try {
    assert.deepEqual(await loadState({ sessionID, directory: root, processID }), {
      actions: [{ id: "undo", enabled: false }, { id: "redo", enabled: true }],
      sessionRevision: "runtime-revision-2",
      activeSessionLeaf: "user-1",
      actionResult: { id: "undo", applied: true, token: "runtime-action-1" }
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("rejects runtime state from a different ACP process or runtime", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-omp-runtime-"))
  const runtimeDirectory = path.join(root, "4242")
  await mkdir(path.join(runtimeDirectory, "sessions"), { recursive: true })
  await writeFile(path.join(runtimeDirectory, "runtime.json"), JSON.stringify({
    schemaVersion: 1,
    protocol: "omp-undo-redo/runtime",
    runtimeId: "current-runtime",
    pid: 4242
  }))
  await writeFile(path.join(runtimeDirectory, "sessions", `${sessionHash}.json`), JSON.stringify({
    schemaVersion: 2,
    protocol: "omp-undo-redo/action-state",
    sessionHash,
    runtimeId: "stale-runtime",
    pid: 4242,
    actions: [{ id: "undo", enabled: true }, { id: "redo", enabled: false }],
    sessionRevision: "stale",
    activeSessionLeaf: "assistant-1"
  }))
  const loadState = createOmpUndoRedoActionStateLoader({
    runtimeRoot: root,
    runGit: async () => { throw new Error("fatal: not a git repository") }
  })

  try {
    assert.equal(await loadState({ sessionID, directory: root, processID: 4242 }), undefined)
    assert.equal(await loadState({ sessionID, directory: root, processID: 9999 }), undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("rejects normalized action state without an authoritative active leaf", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-omp-actions-"))
  const historyDirectory = path.join(root, "omp-undo-redo", "history")
  await mkdir(historyDirectory, { recursive: true })
  await writeFile(path.join(historyDirectory, `${sessionHash}.json`), JSON.stringify({
    actions: [{ id: "undo", enabled: false }, { id: "redo", enabled: true }],
    sessionRevision: "revision-2"
  }))
  const loadState = createOmpUndoRedoActionStateLoader({ runGit: async () => ({ stdout: root }) })

  try {
    assert.equal(await loadState({ sessionID, directory: root }), undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("accepts the normalized optional action protocol with an explicit invocation result", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "harness-remote-omp-actions-"))
  const historyDirectory = path.join(root, "omp-undo-redo", "history")
  await mkdir(historyDirectory, { recursive: true })
  await writeFile(path.join(historyDirectory, `${sessionHash}.json`), JSON.stringify({
    actions: [{ id: "undo", enabled: false }, { id: "redo", enabled: true }],
    sessionRevision: "revision-2",
    activeSessionLeaf: "user-1",
    actionResult: { id: "undo", applied: false, token: "action-2" }
  }))
  const loadState = createOmpUndoRedoActionStateLoader({ runGit: async () => ({ stdout: root }) })

  try {
    assert.deepEqual(await loadState({ sessionID, directory: root }), {
      actions: [{ id: "undo", enabled: false }, { id: "redo", enabled: true }],
      sessionRevision: "revision-2",
      activeSessionLeaf: "user-1",
      actionResult: { id: "undo", applied: false, token: "action-2" }
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
