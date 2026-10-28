import { memo } from 'react'
import type { Item } from '../hooks/useBatch'
import type { Preset } from '../lib/presets'
import { CheckIcon, DownloadIcon, LockIcon, RetryIcon, Spinner, XIcon } from './Icons'
import { ResultCanvas } from './ResultCanvas'

interface Props {
  item: Item
  preset: Preset
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onLocked: () => void
}

const STATUS: Record<Item['status'], { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-zinc-900/70 text-white' },
  processing: { label: 'Processing', className: 'bg-accent-600 text-white' },
  done: { label: 'Done', className: 'bg-emerald-600 text-white' },
  error: { label: 'Failed', className: 'bg-red-600 text-white' },
  locked: { label: 'Pro', className: 'bg-amber-500 text-zinc-950' },
}

export const ImageCard = memo(function ImageCard({ item, preset, onOpen, onRemove, onRetry, onDownload, onLocked }: Props) {
  const { status, cutout } = item
  const s = STATUS[status]
  const clickable = status === 'done' || status === 'locked'

  return (
    <li
      className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="card"
      data-status={status}
    >
      <button
        type="button"
        disabled={!clickable}
        onClick={() => (status === 'locked' ? onLocked() : onOpen(item.id))}
        className="relative block aspect-square w-full cursor-default enabled:cursor-pointer"
        aria-label={status === 'done' ? `Compare before and after for ${item.file.name}` : item.file.name}
      >
        {status === 'done' && cutout ? (
          <div className={`${preset.background === 'transparent' ? 'checker' : 'bg-zinc-100 dark:bg-zinc-800'} absolute inset-0 flex items-center justify-center p-2`}>
            <ResultCanvas
              cutout={cutout}
              source={cutout.preview}
              preset={preset}
              maxSide={480}
              className="max-h-full max-w-full shadow-sm ring-1 ring-zinc-900/10"
            />
          </div>
        ) : (
          <img
            src={item.url}
            alt=""
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 size-full object-contain p-2 ${status === 'locked' ? 'opacity-40 blur-[2px]' : status === 'queued' ? 'opacity-60' : ''}`}
          />
        )}
        {status === 'processing' && <div className="shimmer absolute inset-0 overflow-hidden bg-accent-600/10" />}
        {status === 'locked' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            <LockIcon width={20} height={20} />
            Unlock to process
          </div>
        )}
      </button>

      <span className={`pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
        {status === 'processing' && <Spinner width={12} height={12} />}
        {status === 'done' && <CheckIcon width={12} height={12} />}
        {s.label}
      </span>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 rounded-full bg-zinc-900/60 p-1 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${item.file.name}`}
      >
        <XIcon width={14} height={14} />
      </button>

      <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <p className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-400" title={item.error ?? item.file.name}>
          {status === 'error' ? <span className="text-red-600">{item.error}</span> : item.file.name}
        </p>
        {status === 'done' && (
          <button
            type="button"
            onClick={() => onDownload(item.id)}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label={`Download ${item.file.name}`}
          >
            <DownloadIcon />
          </button>
        )}
        {status === 'error' && (
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800"
            aria-label={`Retry ${item.file.name}`}
          >
            <RetryIcon />
          </button>
        )}
      </div>
    </li>
  )
})
