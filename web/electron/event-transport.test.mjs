import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, after } from 'node:test'

const { DesktopEventTransport } = await import('../dist-electron/electron/event-transport.js')
const { ProfileRegistry } = await import('../dist-electron/electron/profile-registry.js')
const { IPC_CHANNELS } = await import('../dist-electron/electron/ipc-contract.js')

const messages = []
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  response.write(': heartbeat\r\n\r\n')
  response.write('event: update\ndata: {"type":"session.')
  setTimeout(() => response.write('created"}\r\n\r\n'), 10)
  setTimeout(() => response.write('data: not-json\n\n'), 20)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let replacementHits = 0
const replacementServer = createServer((_request, response) => {
  replacementHits += 1
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  response.write('event: replaced\ndata: {"type":"session.replaced"}\n\n')
})
await new Promise((resolve) => replacementServer.listen(0, '127.0.0.1', resolve))
const profile = {
  id: 'events',
  backend: 'opencode',
  host: '127.0.0.1',
  port: server.address().port,
  username: 'user',
  password: 'secret'
}
const directory = await mkdtemp(join(tmpdir(), 'harness-events-'))
const registry = new ProfileRegistry(join(directory, 'profiles.json'))
await registry.replace([profile])
const owner = {
  isDestroyed: () => false,
  send(channel, message) {
    assert.equal(channel, IPC_CHANNELS.event)
    messages.push(message)
  }
}
const transport = new DesktopEventTransport(registry, IPC_CHANNELS)

after(async () => {
  transport.closeAll()
  await new Promise((resolve) => server.close(resolve))
  await new Promise((resolve) => replacementServer.close(resolve))
  await rm(directory, { recursive: true, force: true })
})

function waitFor(predicate, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const check = () => {
      if (predicate()) return resolve()
      if (Date.now() - started > timeout) return reject(new Error('timed out waiting for SSE event'))
      setTimeout(check, 5)
    }
    check()
  })
}
test('profile target change restarts subscription against acknowledged registry target', async () => {
  messages.length = 0
  const { subscriptionId } = await transport.subscribe(owner, profile.id, { scope: 'global' })
  await waitFor(() => messages.some((message) => message.kind === 'status' && message.status.type === 'connected'))
  const change = await registry.replace([{ ...profile, port: replacementServer.address().port }], 2)
  transport.applyRegistryChange(change)
  await waitFor(() => replacementHits > 0)
  await waitFor(() => messages.some((message) => message.kind === 'event' && message.event.name === 'replaced'))
  transport.unsubscribe(owner, subscriptionId)
})

test('desktop SSE forwards split frames, parse errors, and one closed status', async () => {
  messages.length = 0
  await registry.replace([profile], 3)
  const { subscriptionId } = await transport.subscribe(owner, profile.id, { scope: 'global' })
  await waitFor(() => messages.some((message) => message.kind === 'event'))
  const event = messages.find((message) => message.kind === 'event')
  assert.equal(event.event.name, 'update')
  assert.deepEqual(event.event.data, { type: 'session.created' })
  await waitFor(() => messages.some((message) => message.kind === 'status' && message.status.type === 'parse-error'))
  transport.unsubscribe(owner, subscriptionId)
  transport.unsubscribe(owner, subscriptionId)
  assert.equal(messages.filter((message) => message.kind === 'status' && message.status.type === 'closed').length, 1)
})
