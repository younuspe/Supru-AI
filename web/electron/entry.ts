import { app, net, protocol } from "electron"
import { promises as fs } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

app.whenReady().then(async () => {
  protocol.handle("file", async (request) => {
    try {
      const url = new URL(request.url)
      if (url.pathname.includes("/dist/assets/") && /\.tsx?$/.test(url.pathname)) {
        const requestedPath = fileURLToPath(url)
        const javascriptPath = requestedPath.replace(/\.tsx?$/, ".js")
        try {
          const body = await fs.readFile(javascriptPath)
          return new Response(body, {
            headers: { "content-type": "text/javascript; charset=utf-8" }
          })
        } catch {
          // If the corresponding JavaScript asset is genuinely absent, fall through so
          // Electron reports the real missing-file error instead of hiding it.
        }
      }
    } catch {}
    return net.fetch(request.url)
  })

  await import("./main.js")
}).catch((error) => {
  console.error(`[electron-entry] startup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  app.quit()
})
