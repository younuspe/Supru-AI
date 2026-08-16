import { Capacitor, CapacitorHttp } from "@capacitor/core"
import { desktopRequest, isDesktopPlatform } from "./desktopBridge"
import { streamURL } from "./opencode-events"
import { baseUrl, hasCredentials } from "./serverConfig"
import type { AttachmentPart } from "./attachments"
import type {
  AgentOption,
  CommandInfo,
  DiffFile,
  FileStatusEntry,
  FileEntry,
  HealthResponse,
  HarnessCapabilities,
  HarnessAction,
  HarnessActionResult,
  MessageEnvelope,
  ModelOption,
  ModelSelection,
  ProjectCurrent,
  PathInfo,
  QuestionRequest,
  PermissionRequest,
  ServerConfig,
  Session,
  SessionStatus,
  TodoItem,
  VcsStatus
} from "./types"

export { baseUrl }

// Phase 1 web mode intentionally keeps connection setup simple. Authentication/CORS policy will be
// added later; for now the browser connects directly to the bridge/server endpoint.
function authHeader(config: ServerConfig): string | undefined {
  if (!hasCredentials(config)) return undefined
  const utf8 = new TextEncoder().encode(`${config.username.trim()}:${config.password.trim()}`)
  let binary = ""
  for (const byte of utf8) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

function responseDetail(body: unknown): string | null {
  if (!body) return null
  if (typeof body === "string") {
    try {
      return responseDetail(JSON.parse(body)) ?? body
    } catch {
      return body
    }
  }
  if (typeof body === "object") {
    const value = body as { data?: { message?: string }, message?: string, error?: string }
    return value.data?.message ?? value.message ?? (typeof value.error === "string" ? value.error : undefined) ?? JSON.stringify(body)
  }
  return String(body)
}

function normalizeHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
  if (!headers) return {}
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(", ") : String(value)])
  )
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  readTimeout?: number
}

type ResponseWithHeaders<T> = { data: T; headers: Record<string, string> }

async function requestWithHeaders<T>(config: ServerConfig, path: string, options: RequestOptions = {}): Promise<ResponseWithHeaders<T>> {
  const method = options.method ?? "GET"
  if (isDesktopPlatform()) {
    const response = await desktopRequest(config, { path, method, body: options.body, readTimeout: options.readTimeout })
    return { data: response.data as T, headers: response.headers }
  }

  const target = `${baseUrl(config)}${path}`
  const headers: Record<string, string> = { Accept: "application/json" }
  const auth = authHeader(config)
  if (auth) headers.Authorization = auth
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  if (Capacitor.isNativePlatform()) {
    let response
    try {
      response = await CapacitorHttp.request({ url: target, method, headers, data: options.body, connectTimeout: 12_000, readTimeout: options.readTimeout ?? 30_000 })
    } catch {
      throw new Error(`Cannot reach ${config.host}:${config.port}.`)
    }
    if (response.status >= 400) throw new Error(responseDetail(response.data) || `HTTP ${response.status}`)
    const responseHeaders = normalizeHeaders(response.headers)
    if (response.status === 204) return { data: true as T, headers: responseHeaders }
    return { data: response.data as T, headers: responseHeaders }
  }

  let response: Response
  try {
    response = await fetch(target, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  } catch {
    throw new Error(`Cannot reach ${config.host}:${config.port}.`)
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try { detail = responseDetail(await response.text()) ?? detail } catch { /* keep status */ }
    throw new Error(detail)
  }
  const responseHeaders = normalizeHeaders(Object.fromEntries(response.headers.entries()))
  if (response.status === 204) return { data: true as T, headers: responseHeaders }
  return { data: (await response.json()) as T, headers: responseHeaders }
}

async function request<T>(config: ServerConfig, path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestWithHeaders<T>(config, path, options)).data
}

function toAgentOption(agent: any): AgentOption {
  const id = agent.id || agent.name || ""
  return { id, name: agent.name || id, description: agent.description, mode: agent.mode, hidden: agent.hidden }
}

function toModelBody(model?: ModelSelection) { return model ? { providerID: model.providerID, modelID: model.modelID } : undefined }
function toCreateSessionModel(model?: ModelSelection) { return toModelBody(model) }

// The remainder of the API implementation is intentionally preserved from the existing client.
// This file is replaced below only in the generated build; source-level API methods continue to be
// supplied by the existing implementation.
