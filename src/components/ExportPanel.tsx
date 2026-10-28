import { SIZES, type Preset } from '../lib/presets'
import { DownloadIcon, LockIcon, Spinner } from './Icons'

interface Props {
  preset: Preset
  pro: boolean
  doneCount: number
  pendingCount: number
  zipProgress: { done: number; total: number } | null
  onZip: () => void
}

export function ExportPanel({ preset, pro, doneCount, pendingCount, zipProgress, onZip }: Props) {
  const px = SIZES[preset.size].px
  const dims = px ? (preset.crop === 'none' ? `${px}px long side` : `${px} × ${px}`) : preset.crop === 'none' ? 'original size' : 'square, original resolution'
  const zipping = zipProgress !== null

  return (
    <section className="space-y-3" aria-label="Export">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Export</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        PNG · {dims}
        {preset.background === 'transparent' ? ' · transparent' : ''}
      </p>
      <button type="button" onClick={onZip} disabled={doneCount === 0 || zipping} className="btn-primary w-full py-2.5" data-testid="zip-button">
        {zipping ? (
          <>
            <Spinner /> Rendering {Math.min(zipProgress.done + 1, zipProgress.total)} of {zipProgress.total}…
          </>
        ) : (
          <>
            {pro ? <DownloadIcon /> : <LockIcon />}
            Download all as ZIP{doneCount ? ` (${doneCount})` : ''}
          </>
        )}
      </button>
      <p className="text-xs text-zinc-500">
        {doneCount === 0
          ? 'Your cutouts will be ready to download here.'
          : pendingCount > 0
            ? `${pendingCount} still processing — the ZIP includes finished photos only.`
            : pro
              ? 'Or download single photos from each card.'
              : 'Free: download single photos from each card. ZIP export is Pro.'}
      </p>
    </section>
  )
}
