export type ParsedOpenCodeEvent =
  | { ok: true; name: string; raw: string; data: unknown }
  | { ok: false; name: string; raw: string; error: string }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Event payload is not valid JSON"
}

/** Preserves raw payloads until OpenCode event shapes are validated in the app. */
export function parseOpenCodeEvent(data: string, name = "message"): ParsedOpenCodeEvent {
  try {
    return { ok: true, name, raw: data, data: JSON.parse(data) as unknown }
  } catch (error) {
    return { ok: false, name, raw: data, error: errorMessage(error) }
  }
}

/** Parses one SSE frame received through an authenticated fetch stream. */
export function parseSSEFrame(frame: string): ParsedOpenCodeEvent | null {
  let name = "message"
  const data: string[] = []
  for (const line of frame.replace(/\r/g, "").split("\n")) {
    if (!line || line.startsWith(":")) continue
    const separator = line.indexOf(":")
    const field = separator === -1 ? line : line.slice(0, separator)
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "")
    if (field === "event") name = value || name
    if (field === "data") data.push(value)
  }
  if (data.length === 0) return null
  return parseOpenCodeEvent(data.join("\n"), name)
}
