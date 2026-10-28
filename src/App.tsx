import { useCallback, useEffect, useMemo, useState } from 'react'
import { CompareModal } from './components/CompareModal'
import { Dropzone } from './components/Dropzone'
import { ExportPanel } from './components/ExportPanel'
import { BoltIcon, LockIcon, ShieldIcon, Spinner } from './components/Icons'
import { ImageCard } from './components/ImageCard'
import { PresetsPanel } from './components/PresetsPanel'
import { UnlockDialog } from './components/UnlockDialog'
import { useBatch } from './hooks/useBatch'
import { useLicense } from './hooks/useLicense'
import { buildZip, outputName, saveBlob, zipName } from './lib/export'
import { filesFromDrop, partitionFiles } from './lib/files'
import { DEFAULT_PRESET, FREE_BATCH_LIMIT, isPresetAllowed, PRICE, toFreePreset, type Preset } from './lib/presets'
import { renderPng } from './lib/render'

// remove.bg's standalone site closes 1 Dec 2026, 09:00 CET.
const SHUT_DOWN = Date.now() >= Date.parse('2026-12-01T08:00:00Z')
const SOURCE_URL = import.meta.env.VITE_SOURCE_URL as string | undefined
const PRESET_KEY = 'dropbg.preset'

function loadPreset(): Preset {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    return raw ? { ...DEFAULT_PRESET, ...(JSON.parse(raw) as Partial<Preset>) } : DEFAULT_PRESET
  } catch {
    return DEFAULT_PRESET
  }
}

const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

export default function App() {
  const { pro, activate, remove: removeLicense } = useLicense()
  const { items, download, addFiles, remove, clear, retry } = useBatch(pro)
  const [rawPreset, setPreset] = useState(loadPreset)
  const preset = useMemo(() => (isPresetAllowed(rawPreset, pro) ? rawPreset : toFreePreset(rawPreset)), [rawPreset, pro])
  const [unlockReason, setUnlockReason] = useState<string | null | undefined>(undefined)
  const [openId, setOpenId] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(rawPreset))
    } catch {
      /* storage unavailable */
    }
  }, [rawPreset])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const onFiles = useCallback(
    (files: File[]) => {
      const { accepted, skipped } = partitionFiles(files)
      if (skipped.length) {
        setNotice(`Skipped ${skipped.length} file${skipped.length > 1 ? 's' : ''} that aren't JPG, PNG or WEBP (${skipped.slice(0, 3).map((f) => f.name).join(', ')}${skipped.length > 3 ? '…' : ''}).`)
      }
      if (accepted.length) addFiles(accepted)
    },
    [addFiles],
  )

  // Drop anywhere on the page.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      if (--depth <= 0) {
        depth = 0
        setDragging(false)
      }
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      depth = 0
      setDragging(false)
      if (!e.dataTransfer || !hasFiles(e)) return
      e.preventDefault()
      void filesFromDrop(e.dataTransfer).then(onFiles)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [onFiles])

  const done = items.filter((it) => it.status === 'done')
  const locked = items.filter((it) => it.status === 'locked').length
  const active = items.filter((it) => it.status === 'queued' || it.status === 'processing').length
  const tracked = items.length - locked
  const finished = items.filter((it) => it.status === 'done' || it.status === 'error').length
  const avgMs = done.length ? done.reduce((s, it) => s + (it.ms ?? 0), 0) / done.length : 0
  const device = done.at(-1)?.cutout?.device
  const downloading = download !== null && download.loaded < download.total && done.length === 0

  const openUnlock = useCallback((reason?: string) => setUnlockReason(reason ?? null), [])
  const onLocked = useCallback(() => openUnlock(`You've used the ${FREE_BATCH_LIMIT} free photos in this batch.`), [openUnlock])

  const downloadOne = useCallback(
    async (id: string) => {
      const item = items.find((it) => it.id === id)
      if (!item?.cutout) return
      try {
        saveBlob(await renderPng(item.cutout, preset), outputName(item.file.name))
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Export failed')
      }
    },
    [items, preset],
  )

  const downloadZip = async () => {
    if (!pro) return openUnlock('ZIP export is a Pro feature.')
    const entries = done.map((it) => ({ name: it.file.name, cutout: it.cutout! }))
    try {
      setZipProgress({ done: 0, total: entries.length })
      const zip = await buildZip(entries, preset, (d, total) => setZipProgress({ done: d, total }))
      saveBlob(zip, zipName())
    } catch (err) {
      setNotice(err instanceof Error ? `ZIP export failed: ${err.message}` : 'ZIP export failed')
    } finally {
      setZipProgress(null)
    }
  }

  const doneIds = done.map((it) => it.id)
  const openIndex = openId ? doneIds.indexOf(openId) : -1
  const openItem = openIndex >= 0 ? done[openIndex] : null

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="checker inline-block size-6 rounded-md ring-1 ring-zinc-900/10" aria-hidden />
            DropBG
          </div>
          <div className="flex-1" />
          {pro ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              Pro unlocked
            </span>
          ) : (
            <button type="button" onClick={() => openUnlock()} className="btn-secondary">
              <LockIcon /> Unlock Pro — {PRICE}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {SHUT_DOWN ? 'remove.bg shut down on Dec 1.' : 'remove.bg is shutting down Dec 1.'}{' '}
            <span className="text-accent-600 dark:text-accent-500">Remove backgrounds right in your browser — nothing gets uploaded.</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5"><ShieldIcon className="text-emerald-600" /> Runs on your device</span>
            <span className="inline-flex items-center gap-1.5"><BoltIcon className="text-amber-500" /> Batch + marketplace presets</span>
            <span>No signup · {FREE_BATCH_LIMIT} photos free per batch</span>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <Dropzone compact={items.length > 0} onFiles={onFiles} />

            {notice && (
              <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                {notice}
              </p>
            )}

            {items.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900" data-testid="progress">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {downloading ? (
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Spinner /> Downloading the AI model (one-time) · {mb(download.loaded)} of {mb(download.total)}
                    </span>
                  ) : active > 0 ? (
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Spinner /> {done.length === 0 && finished === 0 ? 'Warming up the model…' : `Removing backgrounds · ${finished} of ${tracked}`}
                      {avgMs > 0 && <span className="font-normal text-zinc-500">· about {Math.ceil((avgMs * active) / 1000)}s left</span>}
                    </span>
                  ) : (
                    <span className="font-medium">
                      {done.length} of {tracked} done
                    </span>
                  )}
                  <span className="flex-1" />
                  {device && <span className="text-xs text-zinc-500">{device === 'gpu' ? 'WebGPU' : 'CPU (WASM)'} · {(avgMs / 1000).toFixed(1)}s/photo</span>}
                  <button type="button" onClick={clear} className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white">
                    Clear all
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-accent-600 transition-[width] duration-300"
                    style={{ width: `${downloading ? (download.loaded / download.total) * 100 : tracked ? (finished / tracked) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {locked > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <LockIcon className="text-amber-600" />
                <p className="flex-1">
                  Free batches are limited to {FREE_BATCH_LIMIT} photos. <strong>{locked} more</strong> waiting.
                </p>
                <button type="button" onClick={onLocked} className="btn-primary">
                  Unlock all — {PRICE} once
                </button>
              </div>
            )}

            {items.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <ImageCard
                    key={item.id}
                    item={item}
                    preset={preset}
                    onOpen={setOpenId}
                    onRemove={remove}
                    onRetry={retry}
                    onDownload={downloadOne}
                    onLocked={onLocked}
                  />
                ))}
              </ul>
            )}
          </div>

          <aside className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6 dark:border-zinc-800 dark:bg-zinc-900">
            <PresetsPanel preset={preset} pro={pro} onChange={setPreset} onLocked={openUnlock} />
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <ExportPanel preset={preset} pro={pro} doneCount={done.length} pendingCount={active} zipProgress={zipProgress} onZip={downloadZip} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-4 gap-y-1 px-4 py-5 text-xs text-zinc-500 sm:px-6">
          <span>Photos never leave your device. Background removal runs locally with IMG.LY’s open-source model (AGPL-3.0) on ONNX Runtime.</span>
          {SOURCE_URL && (
            <a href={SOURCE_URL} className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white">
              Source code
            </a>
          )}
          <span>Not affiliated with remove.bg or Canva.</span>
          {pro && (
            <button type="button" onClick={() => void removeLicense()} className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white">
              Remove license from this browser
            </button>
          )}
        </div>
      </footer>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent-600/15 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-accent-600 bg-white px-10 py-8 text-lg font-semibold shadow-xl dark:bg-zinc-900">
            Drop photos or a folder
          </div>
        </div>
      )}

      {openItem && (
        <CompareModal
          key="compare"
          item={openItem}
          prevId={doneIds[openIndex - 1] ?? null}
          nextId={doneIds[openIndex + 1] ?? null}
          preset={preset}
          onNavigate={setOpenId}
          onClose={() => setOpenId(null)}
          onDownload={downloadOne}
        />
      )}

      {unlockReason !== undefined && (
        <UnlockDialog reason={unlockReason} onActivate={activate} onClose={() => setUnlockReason(undefined)} />
      )}
    </div>
  )
}
