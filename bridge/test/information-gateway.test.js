import test from "node:test"
import assert from "node:assert/strict"
import { searchInformation } from "../src/information-gateway.js"

test("information gateway returns sourced results", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    pages: [{ key: "Supru", title: "Supru", description: "A test result", excerpt: "A sourced result" }]
  }), { status: 200, headers: { "content-type": "application/json" } })
  try {
    const result = await searchInformation("Supru")
    assert.equal(result.provider, "Wikipedia")
    assert.equal(result.query, "Supru")
    assert.equal(result.results[0].title, "Supru")
    assert.match(result.results[0].sourceUrl, /wikipedia\.org\/wiki\/Supru/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("information gateway rejects an empty query", async () => {
  await assert.rejects(() => searchInformation("   "), /information query is required/i)
})
