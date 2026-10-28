// Downloads the ONNX model + onnxruntime WASM that @imgly/background-removal
// needs into public/bg-assets so they're served same-origin (no third-party
// CDN at runtime). Only the files we use are fetched (~123 MB, not 221 MB).
// Idempotent: chunks already on disk with the right size are skipped.
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'bg-assets')
const pkg = JSON.parse(
  await readFile(join(root, 'node_modules/@imgly/background-removal/package.json'), 'utf8'),
)
const base = `https://staticimgly.com/@imgly/background-removal-data/${pkg.version}/dist/`
const KEEP = [
  '/models/isnet_fp16',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
]

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (attempt >= 4) throw new Error(`GET ${url} failed: ${err.message}`)
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
}

const all = JSON.parse((await get(base + 'resources.json')).toString('utf8'))
const resources = Object.fromEntries(KEEP.map((k) => {
  if (!all[k]) throw new Error(`${k} missing from resources.json for ${pkg.version}`)
  return [k, all[k]]
}))

await mkdir(outDir, { recursive: true })
const jobs = Object.values(resources).flatMap((r) => r.chunks)
let done = 0
let fetched = 0
async function worker() {
  while (jobs.length) {
    const chunk = jobs.shift()
    const file = join(outDir, chunk.name)
    const size = chunk.offsets[1] - chunk.offsets[0]
    const existing = await stat(file).catch(() => null)
    if (existing?.size !== size) {
      const buf = await get(base + chunk.name)
      if (buf.length !== size) throw new Error(`${chunk.name}: expected ${size} bytes, got ${buf.length}`)
      await writeFile(file, buf)
      fetched++
    }
    done++
  }
}
const total = jobs.length
await Promise.all(Array.from({ length: 6 }, worker))
await writeFile(join(outDir, 'resources.json'), JSON.stringify(resources))
console.log(`bg-assets: ${total} chunks ready (${fetched} downloaded) for @imgly/background-removal ${pkg.version}`)
