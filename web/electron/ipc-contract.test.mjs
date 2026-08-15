import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const { IPC_CHANNELS } = await import('../dist-electron/electron/ipc-contract.js')
const preload = await readFile(new URL('./preload.cts', import.meta.url), 'utf8')

test('preload channel map matches main IPC contract', () => {
  for (const [name, channel] of Object.entries(IPC_CHANNELS)) {
    assert.match(preload, new RegExp(`${name}: "${channel}"`), `preload channel ${name} drifted`)
  }
})
