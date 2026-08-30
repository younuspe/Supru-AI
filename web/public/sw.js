const CACHE_NAME = "supru-ai-v2"

self.addEventListener("install", (event) => {
  const scope = self.registration.scope
  const appShell = [
    scope,
    `${scope}manifest.webmanifest`,
    `${scope}Supru%20AI%20ico.png`,
    `${scope}Supru%20AI%20-%20icon.png`,
    `${scope}Supru%20AI%20WEb.png`,
    `${scope}Surpu%20Ai%20Mob.png`
  ]
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(appShell))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

function storeInCache(event, key, response) {
  const copy = response.clone()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(key, copy)))
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    const scope = self.registration.scope
    event.respondWith(
      fetch(request)
        .then((response) => {
          storeInCache(event, scope, response)
          return response
        })
        .catch(() => caches.match(scope))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) storeInCache(event, request, response)
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
