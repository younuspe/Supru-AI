import { cpSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const source = resolve(root, "native-android")
const target = resolve(root, "android/app/src/main/java/ai/harness/remote")

if (!existsSync(target)) throw new Error("Android project not found; run npx cap sync android first")
for (const file of ["MainActivity.java", "LiveEventsPlugin.java"]) {
  cpSync(resolve(source, file), resolve(target, file))
}
console.log("Synced Harness Remote live-events plugin")
