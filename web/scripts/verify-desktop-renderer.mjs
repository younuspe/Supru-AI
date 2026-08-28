import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = new URL("../dist/", import.meta.url)
const dist = root.pathname

if (!existsSync(dist)) throw new Error(`Desktop renderer directory is missing: ${dist}`)

const files = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else files.push(full)
  }
}
walk(dist)

const indexPath = join(dist, "index.html")
if (!existsSync(indexPath)) throw new Error("Desktop renderer is missing dist/index.html")

const index = readFileSync(indexPath, "utf8")
const scriptSources = [...index.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1])
if (scriptSources.length === 0) throw new Error("dist/index.html contains no JavaScript entry")

for (const src of scriptSources) {
  if (/\.tsx?($|[?#])/i.test(src) || /\/src\//.test(src)) {
    throw new Error(`Runtime TypeScript/source reference in dist/index.html: ${src}`)
  }
  if (!/\.js($|[?#])/i.test(src)) throw new Error(`Unexpected renderer script in dist/index.html: ${src}`)
  const normalized = src.replace(/^\.\//, "")
  if (!existsSync(join(dist, normalized))) throw new Error(`Renderer script does not exist: ${src}`)
}

const runtimeFiles = files.filter((file) => /\.(html|js|css)$/i.test(file))
const runtimeSourcePattern = /(?:import\s*\(\s*["']|(?:from|import|src|href)\s*[=:]\s*["'])[^"'\n]*\.tsx?(?:["'?#]|$)|["'](?:\.\/)?src\//i
for (const file of runtimeFiles) {
  const text = readFileSync(file, "utf8")
  if (runtimeSourcePattern.test(text)) {
    throw new Error(`Runtime source reference found in ${relative(dist, file)}`)
  }
}

const tsFiles = files.filter((file) => /\.(ts|tsx)$/i.test(file))
if (tsFiles.length > 0) {
  throw new Error(`TypeScript source files were emitted into dist: ${tsFiles.map((file) => relative(dist, file)).join(", ")}`)
}

console.log(`Desktop renderer verified: ${files.length} files, no runtime TypeScript/source references.`)
