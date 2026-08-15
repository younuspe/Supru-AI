import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const { buildApplicationMenu } = await import('../dist-electron/electron/app-menu.js')
const { DESKTOP_MENU_COMMANDS, parseDesktopMenuTemplate } = await import('../dist-electron/electron/ipc-contract.js')

const template = [
  {
    id: 'file',
    label: 'File',
    items: [
      { kind: 'item', command: 'session.new', label: 'New session', accelerator: 'CmdOrCtrl+N', enabled: true },
      { kind: 'separator' },
      { kind: 'item', command: 'server.settings', label: 'Settings', accelerator: 'CmdOrCtrl+,', enabled: false }
    ]
  },
  {
    id: 'view',
    label: 'View',
    items: [{ kind: 'item', command: 'view.theme.dark', label: 'Dark', checked: true }]
  },
  {
    id: 'help',
    label: 'Help',
    items: [{ kind: 'item', command: 'help.open', label: 'Help' }]
  }
]

const labelsOf = (menu) => menu.map((entry) => entry.label ?? entry.role)

test('macOS menu keeps the app, Edit and Window menus in platform order', () => {
  const menu = buildApplicationMenu(template, { appName: 'Harness Remote', isMac: true, onCommand: () => {} })
  // Edit has to sit right after File or Cmd+C/V/X land in a menu nobody looks in, and Help is last.
  assert.deepEqual(labelsOf(menu), ['Harness Remote', 'File', 'editMenu', 'View', 'windowMenu', 'Help'])
})

test('a renderer menu the platform does not name is still placed, not dropped', () => {
  const renamed = [{ id: 'session', label: 'Session', items: template[1].items }]
  const menu = buildApplicationMenu(renamed, { appName: 'App', isMac: true, onCommand: () => {} })
  assert.deepEqual(labelsOf(menu), ['App', 'editMenu', 'Session', 'windowMenu'])
})

test('items carry their accelerator, enabled and checked state', () => {
  const menu = buildApplicationMenu(template, { appName: 'App', isMac: true, onCommand: () => {} })
  const file = menu.find((entry) => entry.label === 'File').submenu
  assert.equal(file[0].accelerator, 'CmdOrCtrl+N')
  assert.equal(file[0].enabled, true)
  assert.equal(file[1].type, 'separator')
  assert.equal(file[2].enabled, false, 'a disabled command must not be clickable in the platform menu')
  const view = menu.find((entry) => entry.label === 'View').submenu
  assert.equal(view[0].type, 'checkbox')
  assert.equal(view[0].checked, true)
})

test('clicking an item reports the command id the renderer sent', () => {
  const fired = []
  const menu = buildApplicationMenu(template, { appName: 'App', isMac: true, onCommand: (id) => fired.push(id) })
  menu.find((entry) => entry.label === 'File').submenu[0].click()
  menu.find((entry) => entry.label === 'Help').submenu[0].click()
  assert.deepEqual(fired, ['session.new', 'help.open'])
})

test('a malformed template is rejected outright rather than partly applied', () => {
  assert.equal(parseDesktopMenuTemplate(null), null)
  assert.equal(parseDesktopMenuTemplate([]), null)
  assert.equal(parseDesktopMenuTemplate([{ id: 'file', label: 'File', items: [] }]), null)
  assert.equal(
    parseDesktopMenuTemplate([{ id: 'file', label: 'File', items: [{ kind: 'item', command: 'not.a.command', label: 'X' }] }]),
    null,
    'an unknown command id must not reach Electron'
  )
  assert.equal(
    parseDesktopMenuTemplate([{ id: 'file', label: 'File', items: [{ kind: 'item', command: 'session.new', label: 'New\u0007' }] }]),
    null,
    'control characters must not reach a native menu'
  )
  assert.equal(
    parseDesktopMenuTemplate([{ id: 'file', label: 'File', items: [{ kind: 'item', command: 'session.new', label: 'New', accelerator: 'rm -rf /' }] }]),
    null,
    'an accelerator outside Electron grammar must be refused'
  )
  assert.ok(parseDesktopMenuTemplate(template), 'the well-formed template must survive validation')
})

async function rendererKeyBindings() {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const source = app.slice(app.indexOf('const KEY_BINDINGS'), app.indexOf('function bindingKeyLabel'))
  const bindings = [...source.matchAll(/"([a-z.]+)":\s*\{ key: "([^"]+)"(, shift: (true))?/g)]
    .map((match) => ({ command: match[1], key: match[2], shift: match[4] === 'true' }))
  assert.ok(bindings.length >= 5, `expected the binding map to parse, got ${JSON.stringify(bindings)}`)
  return bindings
}

test('every command the renderer can bind is one the contract knows', async () => {
  for (const { command } of await rendererKeyBindings()) {
    assert.ok(
      DESKTOP_MENU_COMMANDS.includes(command),
      `"${command}" has a keyboard shortcut but is not a command the platform menu can carry`
    )
  }
})

// The validator is strict on purpose, and the renderer is the only thing that ever feeds it. A
// fixture proves the validator works; this proves the two agree — including the comma accelerator,
// which is the one a tighter grammar would quietly refuse.
test('the accelerators the renderer derives all pass the IPC validator', async () => {
  const bindings = await rendererKeyBindings()
  const items = bindings.map(({ command, key, shift }) => ({
    kind: 'item',
    command,
    label: command,
    accelerator: `CmdOrCtrl+${shift ? 'Shift+' : ''}${key.length === 1 && /[a-z]/.test(key) ? key.toUpperCase() : key}`
  }))
  const parsed = parseDesktopMenuTemplate([{ id: 'file', label: 'File', items }])
  assert.ok(parsed, `the validator rejected accelerators the renderer produces: ${JSON.stringify(items.map((item) => item.accelerator))}`)
  assert.equal(parsed[0].items.length, items.length)
})
