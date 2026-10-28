import JSZip from 'jszip'
import type { Preset } from './presets'
import { renderPng, type Cutout } from './render'

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function outputName(original: string): string {
  const base = original.replace(/\.[^./\\]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim()
  return `${base || 'image'}.png`
}

/** Output names for a batch, de-duplicated (`shoe.png`, `shoe-2.png`, …). */
export function uniqueNames(originals: string[]): string[] {
  const used = new Set<string>()
  return originals.map((name) => {
    const base = outputName(name).slice(0, -4)
    let out = `${base}.png`
    for (let n = 2; used.has(out.toLowerCase()); n++) out = `${base}-${n}.png`
    used.add(out.toLowerCase())
    return out
  })
}

export async function buildZip(
  entries: { name: string; cutout: Cutout }[],
  preset: Preset,
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip()
  const names = uniqueNames(entries.map((e) => e.name))
  for (let i = 0; i < entries.length; i++) {
    onProgress(i, entries.length)
    // PNGs are already compressed; deflating them again just burns CPU.
    zip.file(names[i], await renderPng(entries[i].cutout, preset), { compression: 'STORE' })
  }
  onProgress(entries.length, entries.length)
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
}

export function zipName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `dropbg-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.zip`
}
