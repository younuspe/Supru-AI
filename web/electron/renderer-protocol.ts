import { net, protocol } from "electron"
import { existsSync, statSync } from "node:fs"
import { isAbsolute, join, normalize, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const SUPRU_SCHEME = "supru"
export const SUPRU_HOST = "app"

// Must run before app.ready when registering a privileged scheme.
export function registerSupruScheme(): void {
  protocol.registerSchemesAsPrivileged([{
    scheme: SUPRU_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }])
}

export function installSupruProtocol(rendererRoot: string): void {
  const root = normalize(rendererRoot)
  protocol.handle(SUPRU_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== SUPRU_HOST) return new Response("Not Found", { status: 404 })

      let pathname = decodeURIComponent(url.pathname)
      if (pathname === "/" || pathname === "") pathname = "/index.html"
      const candidate = normalize(join(root, pathname.replace(/^\/+/, "")))
      const rel = relative(root, candidate)
      if (rel.startsWith("..") || isAbsolute(rel)) return new Response("Forbidden", { status: 403 })
      if (!existsSync(candidate) || !statSync(candidate).isFile()) return new Response("Not Found", { status: 404 })

      return net.fetch(pathToFileURL(candidate).toString())
    } catch {
      return new Response("Bad Request", { status: 400 })
    }
  })
}

export function supruRendererURL(): string {
  return `${SUPRU_SCHEME}://${SUPRU_HOST}/index.html`
}
