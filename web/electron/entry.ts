import { app, net, protocol } from "electron"

app.whenReady().then(async () => {
  protocol.handle("file", async (request) => {
    try {
      const url = new URL(request.url)
      if (url.pathname.includes("/dist/assets/") && /\.tsx?$/.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\.tsx?$/, ".js")
        return net.fetch(url.toString())
      }
    } catch {}
    return net.fetch(request.url)
  })

  await import("./main.js")
}).catch((error) => {
  console.error(`[electron-entry] startup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  app.quit()
})
