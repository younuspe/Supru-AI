const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/rest.php/v1/search/page"
const DEFAULT_LIMIT = 6
const MAX_LIMIT = 10
const REQUEST_TIMEOUT_MS = 8_000

function cleanQuery(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
}

function normalizeResult(page) {
  const key = typeof page.key === "string" ? page.key : ""
  const title = typeof page.title === "string" ? page.title : key
  const description = typeof page.description === "string" ? page.description : ""
  const excerpt = typeof page.excerpt === "string" ? page.excerpt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : ""
  const sourceUrl = key ? `https://en.wikipedia.org/wiki/${encodeURIComponent(key.replace(/ /g, "_"))}` : null
  return { title, description, excerpt, sourceUrl }
}

export async function searchInformation(query, { limit = DEFAULT_LIMIT } = {}) {
  const normalized = cleanQuery(query)
  if (!normalized) throw new Error("An information query is required")
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(Number(limit)) ? Number(limit) : DEFAULT_LIMIT))
  const target = `${WIKIPEDIA_SEARCH_URL}?q=${encodeURIComponent(normalized)}&limit=${safeLimit}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(target, {
      headers: { Accept: "application/json", "User-Agent": "Supru-AI/1.0 (information gateway)" },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`Information source returned HTTP ${response.status}`)
    const body = await response.json()
    return {
      query: normalized,
      provider: "Wikipedia",
      source: "https://www.wikipedia.org/",
      results: Array.isArray(body.pages) ? body.pages.map(normalizeResult).filter((item) => item.title && item.sourceUrl) : []
    }
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Information source timed out")
    throw error instanceof Error ? error : new Error("Information lookup failed")
  } finally {
    clearTimeout(timer)
  }
}
