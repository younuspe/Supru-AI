import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const dist = new URL("../dist/", import.meta.url).pathname
if (!existsSync(dist)) throw new Error(`Desktop renderer directory is missing: ${dist}`)

const files = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(html|js|mjs)$/i.test(entry.name)) files.push(full)
  }
}
walk(dist)

let replacements = 0
for (const file of files) {
  const before = readFileSync(file, "utf8")
  const after = before.replace(/(["'`])([^"'`\n?#]+)\.tsx?(?=(["'`?#]|$))/g, (_match, quote, path, suffix) => {
    replacements += 1
    return `${quote}${path}.js${suffix ?? quote}`
  })
  if (after !== before) writeFileSync(file, after)
}

// Any generated .ts/.tsx runtime asset would still be invalid in the packaged app.
const emittedSource = []
function findSource(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) findSource(full)
    else if (/\.(ts|tsx)$/i.test(entry.name)) emittedSource.push(relative(dist, full))
  }
}
findSource(dist)
if (emittedSource.length) throw new Error(`TypeScript runtime assets were emitted: ${emittedSource.join(", ")}`)

console.log(`Desktop runtime imports normalized: ${replacements} TypeScript references.`)
