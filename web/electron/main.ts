import { app, BrowserWindow, Menu, Notification, nativeImage, screen, session, ipcMain, utilityProcess, type IpcMainInvokeEvent, type UtilityProcess } from "electron"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { buildApplicationMenu } from "./app-menu.js"
import { DesktopEventTransport } from "./event-transport.js"
import { IPC_CHANNELS, parseDesktopMenuTemplate } from "./ipc-contract.js"
import { DesktopProfileError, ProfileRegistry } from "./profile-registry.js"
import { executeDesktopRequest } from "./request-transport.js"
import type { DesktopCompletionNotification, DesktopEventSubscriptionOptions, DesktopMenuCommand, DesktopRequest } from "./ipc-contract.js"
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, restoredBounds as calculateRestoredBounds } from "./window-state.js"
const __dirname = dirname(fileURLToPath(import.meta.url))
const isDevelopment = !app.isPackaged
const isWindows = process.platform === "win32"
const isMac = process.platform === "darwin"
const rendererEntry = join(__dirname, "../../dist/index.html")
const profileFile = () => join(app.getPath("userData"), "desktop-profiles.json")
const bridgeEntry = () => isDevelopment
  ? join(__dirname, "../../../../bridge/src/cli.js")
  : join(process.resourcesPath, "bridge/src/cli.js")
let bridgeProcess: UtilityProcess | undefined

type SavedWindowState = { x?: number; y?: number; width?: number; height?: number; maximized?: boolean }
function windowStateFile(): string { return join(app.getPath("userData"), "window-state.json") }
function readWindowState(): SavedWindowState { try { const parsed = JSON.parse(readFileSync(windowStateFile(), "utf8")) as SavedWindowState; return parsed && typeof parsed === "object" ? parsed : {} } catch { return {} } }
function restoredBounds(state: SavedWindowState) { return calculateRestoredBounds(state, screen.getAllDisplays()) }

function startLocalBridge(): void {
  if (bridgeProcess) return
  const entry = bridgeEntry()
  bridgeProcess = utilityProcess.fork(entry, ["--backend", "omp", "--host", "127.0.0.1", "--port", "4097", "--cors", "null", "--cors", "https://younuspe.github.io", "--cors", "http://localhost:5173"], { cwd: isDevelopment ? join(__dirname, "../../../../bridge") : process.resourcesPath, env: process.env })
  bridgeProcess.on("spawn", () => log(`bridge started (${entry})`))
  bridgeProcess.on("message", (message) => log(`bridge: ${typeof message === "string" ? message : JSON.stringify(message)}`))
  bridgeProcess.on("error", (error) => log(`bridge process error: ${String(error)}`))
  bridgeProcess.on("exit", (...args: unknown[]) => {
    const code = typeof args[0] === "number" ? args[0] : null
    const signal = typeof args[1] === "string" ? args[1] : null
    log(`bridge exited (${code ?? "null"}${signal ? `/${signal}` : ""})`)
    bridgeProcess = undefined
  })
}
function stopLocalBridge(): void { if (!bridgeProcess) return; bridgeProcess.kill(); bridgeProcess = undefined }

let mainWindow: BrowserWindow | undefined
let registry: ProfileRegistry
let eventTransport: DesktopEventTransport | undefined
function log(message: string): void { console.error(`[electron] ${message}`) }
function trustedSender(event: IpcMainInvokeEvent): boolean {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return false
  if (event.senderFrame !== mainWindow.webContents.mainFrame) return false
  try { const expected = new URL(pathToFileURL(rendererEntry).toString()); const actual = new URL(event.senderFrame.url); return actual.protocol === expected.protocol && actual.hostname === expected.hostname && actual.pathname === expected.pathname } catch { return false }
}
function ensureTrustedSender(event: IpcMainInvokeEvent): void { if (!trustedSender(event)) throw new Error("Untrusted IPC sender") }
function notificationText(value: unknown, maxLength: number): value is string { return typeof value === "string" && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value) }
function applyApplicationMenu(template: unknown): boolean {
  if (!isMac) return false
  const parsed = parseDesktopMenuTemplate(template); if (!parsed) return false
  const sendCommand = (command: DesktopMenuCommand) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.menuCommand, command) }
  try { Menu.setApplicationMenu(Menu.buildFromTemplate(buildApplicationMenu(parsed, { appName: app.getName(), isMac, onCommand: sendCommand }))); return true } catch { log("application menu could not be built"); return false }
}
function notifyCompletion(notification: DesktopCompletionNotification): void {
  if (!mainWindow || mainWindow.isDestroyed() || (mainWindow.isFocused() && !mainWindow.isMinimized())) return
  if (!Notification.isSupported()) return
  new Notification({ title: notification.title, body: notification.body }).show()
  if (!isWindows) return
  const icon = nativeImage.createFromPath(join(app.getAppPath(), "dist/app-icon.png")).resize({ width: 16, height: 16 })
  if (!icon.isEmpty()) mainWindow.setOverlayIcon(icon, notification.overlayDescription)
}

function createWindow(): BrowserWindow {
  const savedState = readWindowState()
  const window = new BrowserWindow({ ...restoredBounds(savedState), minWidth: MIN_WINDOW_WIDTH, minHeight: MIN_WINDOW_HEIGHT, show: false, backgroundColor: "#101318", webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, spellcheck: false } })
  const contents = window.webContents
  let stateTimer: NodeJS.Timeout | undefined
  const cancelWindowStateSave = () => { clearTimeout(stateTimer); stateTimer = undefined }
  const saveWindowState = () => { if (window.isDestroyed()) return; const bounds = window.getNormalBounds(); const state: SavedWindowState = { ...bounds, maximized: window.isMaximized() }; try { writeFileSync(windowStateFile(), JSON.stringify(state), { encoding: "utf8", mode: 0o600 }) } catch { log("window state could not be saved") } }
  const scheduleWindowStateSave = () => { cancelWindowStateSave(); stateTimer = setTimeout(() => { stateTimer = undefined; saveWindowState() }, 250) }
  window.on("resize", scheduleWindowStateSave); window.on("move", scheduleWindowStateSave); window.on("maximize", scheduleWindowStateSave); window.on("unmaximize", scheduleWindowStateSave)
  window.on("close", () => { saveWindowState(); cancelWindowStateSave() }); window.on("focus", () => { if (isWindows) window.setOverlayIcon(null, "") })
  window.once("ready-to-show", () => { if (savedState.maximized === true) window.maximize(); window.show() })
  contents.on("did-start-navigation", (_event, _url, isInPlace, isMainFrame) => { if (isMainFrame && !isInPlace) eventTransport?.closeForOwner(contents) })
  contents.on("did-fail-load", (_event, errorCode, errorDescription) => { log(`local renderer load failed (${errorCode}): ${errorDescription}`) })
  contents.on("render-process-gone", (_event, details) => { log(`renderer exited (${details.reason})`); eventTransport?.closeForOwner(contents) })
  contents.setWindowOpenHandler(() => ({ action: "deny" })); contents.on("will-navigate", (event, url) => { if (url !== pathToFileURL(rendererEntry).toString()) event.preventDefault() })
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false)); contents.session.on("will-download", (event) => event.preventDefault())
  window.on("closed", () => { cancelWindowStateSave(); eventTransport?.closeForOwner(contents); if (mainWindow === window) mainWindow = undefined })
  void window.loadFile(rendererEntry).catch((error: unknown) => log(`renderer load rejected: ${error instanceof Error ? error.message : "unknown error"}`))
  return window
}

function installIPC(): void {
  ipcMain.handle(IPC_CHANNELS.replaceProfiles, async (event, profiles: unknown, revision: unknown) => { ensureTrustedSender(event); if (!Number.isSafeInteger(revision) || (revision as number) < 1) throw new Error("Profile revision is invalid"); const change = await registry.replace(profiles, revision as number); eventTransport?.applyRegistryChange(change); return change })
  ipcMain.handle(IPC_CHANNELS.request, async (event, profileId: unknown, request: unknown) => { ensureTrustedSender(event); if (typeof profileId !== "string" || !request || typeof request !== "object") return { ok: false, error: { code: "invalid-payload", message: "Request payload is invalid" } }; let profile; try { profile = registry.get(profileId) } catch (error) { if (error instanceof DesktopProfileError) return { ok: false, error: { code: "unknown-profile", message: "Unknown server profile" } }; return { ok: false, error: { code: "internal", message: "Desktop request failed" } } } try { return await executeDesktopRequest(profile, request as DesktopRequest) } catch { return { ok: false, error: { code: "internal", message: "Desktop request failed" } } } })
  ipcMain.handle(IPC_CHANNELS.subscribeEvents, async (event, profileId: unknown, options: unknown) => { ensureTrustedSender(event); if (typeof profileId !== "string" || !options || typeof options !== "object") throw new Error("Event payload is invalid"); if (!eventTransport) throw new Error("Desktop event transport is not ready"); return eventTransport.subscribe(event.sender, profileId, options as DesktopEventSubscriptionOptions) })
  ipcMain.handle(IPC_CHANNELS.unsubscribeEvents, async (event, subscriptionId: unknown) => { ensureTrustedSender(event); if (typeof subscriptionId !== "string") throw new Error("Subscription ID is invalid"); eventTransport?.unsubscribe(event.sender, subscriptionId) })
  ipcMain.handle(IPC_CHANNELS.setMenu, async (event, template: unknown) => { ensureTrustedSender(event); return applyApplicationMenu(template) })
  ipcMain.handle(IPC_CHANNELS.notifyCompletion, async (event, notification: unknown) => { ensureTrustedSender(event); if (!notification || typeof notification !== "object") throw new Error("Notification payload is invalid"); const candidate = notification as Partial<DesktopCompletionNotification>; if (!notificationText(candidate.title, 120) || !notificationText(candidate.body, 1000) || !notificationText(candidate.overlayDescription, 240)) throw new Error("Notification payload is invalid"); notifyCompletion(candidate as DesktopCompletionNotification) })
}

async function start(): Promise<void> {
  app.setAppUserModelId("ai.supru.desktop"); app.setName("Supru AI"); registry = new ProfileRegistry(profileFile()); await registry.load(); eventTransport = new DesktopEventTransport(registry, IPC_CHANNELS); installIPC(); startLocalBridge(); if (!isDevelopment && !isMac) Menu.setApplicationMenu(null); session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false)); mainWindow = createWindow()
}
app.whenReady().then(() => start()).catch((error: unknown) => { log(`startup failed: ${error instanceof Error ? error.message : "unknown error"}`); app.quit() })
app.on("before-quit", () => { eventTransport?.closeAll(); stopLocalBridge() })
app.on("window-all-closed", () => { if (!isMac) app.quit() })
app.on("activate", () => { if (!mainWindow) mainWindow = createWindow() })
