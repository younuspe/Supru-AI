import assert from "node:assert/strict"
import test from "node:test"
import { ensureOpenCodePortAvailable, parseDaemonOptions } from "../src/daemon-cli.js"

const loopbackEnv = { SUPRU_AI_HOST: "127.0.0.1", SUPRU_AI_BACKEND: "codex" }

test("daemon defaults to one ACP primary plus loopback managed OpenCode", () => {
  const parsed = parseDaemonOptions([], loopbackEnv)
  assert.equal(parsed.config.backend, "codex")
  assert.equal(parsed.openCode, true)
  assert.equal(parsed.openCodeCommand, "opencode")
  assert.equal(parsed.openCodeHost, "127.0.0.1")
  assert.equal(parsed.openCodePort, 4096)
  assert.equal(parsed.config.port, 4097)
})

test("daemon does not inherit a LAN daemon bind for managed OpenCode", () => {
  const parsed = parseDaemonOptions(["--host", "0.0.0.0"], { SUPRU_AI_BACKEND: "codex", SUPRU_AI_USERNAME: "supru", SUPRU_AI_PASSWORD: "secret" })
  assert.equal(parsed.config.host, "0.0.0.0")
  assert.equal(parsed.openCodeHost, "127.0.0.1")
})

test("daemon forwards bridge options and consumes OpenCode-specific options", () => {
  const parsed = parseDaemonOptions(["--backend", "claude", "--port", "4900", "--opencode-host", "127.0.0.2", "--opencode-port", "4901", "--opencode-command", "/tools/opencode", "--root", "/work"], loopbackEnv)
  assert.equal(parsed.config.backend, "claude")
  assert.equal(parsed.config.port, 4900)
  assert.deepEqual(parsed.config.roots, ["/work"])
  assert.equal(parsed.openCodeHost, "127.0.0.2")
  assert.equal(parsed.openCodePort, 4901)
  assert.equal(parsed.openCodeCommand, "/tools/opencode")
})

test("daemon can explicitly disable OpenCode during migration", () => { assert.equal(parseDaemonOptions(["--no-opencode"], loopbackEnv).openCode, false) })
test("daemon rejects invalid managed OpenCode ports", () => { assert.throws(() => parseDaemonOptions(["--opencode-port", "nope"], loopbackEnv), /integer between 1 and 65535/) })
test("daemon preflight rejects an occupied managed OpenCode port with an actionable error", async () => { await assert.rejects(ensureOpenCodePortAvailable({ port: 4096, host: "127.0.0.1", canListenImpl: async () => false }), /already in use.*OpenCode already running.*--opencode-port/) })
test("daemon preflight accepts a free managed OpenCode port", async () => { await ensureOpenCodePortAvailable({ port: 4096, host: "127.0.0.1", canListenImpl: async () => true }) })
