import { useEffect, useRef, useState } from 'react'
import type { Item } from '../hooks/useBatch'
import type { Preset } from '../lib/presets'
import type { Cutout } from '../lib/render'
import { ChevronIcon, DownloadIcon, XIcon } from './Icons'
import { ResultCanvas } from './ResultCanvas'

interface Props {
  item: Item
  prevId: string | null
  nextId: string | null
  preset: Preset
  onNavigate: (id: string) => void
  onClose: () => void
  onDownload: (id: string) => void
}

export function CompareModal({ item, prevId, nextId, preset, onNavigate, onClose, onDownload }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cutout = item.cutout!
  // Start from the small preview, then swap in a full-resolution decode for a crisp view.
  const [full, setFull] = useState<{ cutout: Cutout; bitmap: ImageBitmap } | null>(null)
  const source = full?.cutout === cutout ? full.bitmap : cutout.preview

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    let bitmap: ImageBitmap | null = null
    let cancelled = false
    void createImageBitmap(cutout.blob).then((b) => {
      if (cancelled) b.close()
      else setFull({ cutout, bitmap: (bitmap = b) })
    })
    return () => {
      cancelled = true
      bitmap?.close()
    }
  }, [cutout])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevId) onNavigate(prevId)
      if (e.key === 'ArrowRight' && nextId) onNavigate(nextId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevId, nextId, onNavigate])

  const nav = (id: string | null, label: string, flip: boolean) => (
    <button
      type="button"
      disabled={!id}
      onClick={() => id && onNavigate(id)}
      className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
      aria-label={label}
    >
      <ChevronIcon width={20} height={20} className={flip ? 'rotate-180' : ''} />
    </button>
  )

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[min(1100px,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/70 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {nav(prevId, 'Previous photo', true)}
        {nav(nextId, 'Next photo', false)}
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.file.name}</p>
        <span className="hidden text-xs text-zinc-500 sm:inline">
          {cutout.width}×{cutout.height} · {((item.ms ?? 0) / 1000).toFixed(1)}s on {cutout.device === 'gpu' ? 'WebGPU' : 'CPU'}
        </span>
        <button type="button" onClick={() => onDownload(item.id)} className="btn-primary">
          <DownloadIcon /> PNG
        </button>
        <button type="button" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close">
          <XIcon width={18} height={18} />
        </button>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Before</figcaption>
          <div className="flex aspect-square items-center justify-center rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
            <img src={item.url} alt={`Original ${item.file.name}`} className="max-h-full max-w-full object-contain" />
          </div>
        </figure>
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">After</figcaption>
          <div className={`${preset.background === 'transparent' ? 'checker' : 'bg-zinc-100 dark:bg-zinc-800'} flex aspect-square items-center justify-center rounded-xl p-2`}>
            <ResultCanvas
              cutout={cutout}
              source={source}
              preset={preset}
              maxSide={1600}
              className="max-h-full max-w-full shadow ring-1 ring-zinc-900/10"
            />
          </div>
        </figure>
      </div>
    </dialog>
  )
}
