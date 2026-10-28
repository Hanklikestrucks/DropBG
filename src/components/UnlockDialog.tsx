import { useEffect, useRef, useState } from 'react'
import { CHECKOUT_URL } from '../lib/license'
import { FREE_BATCH_LIMIT, PRICE } from '../lib/presets'
import { CheckIcon, Spinner, XIcon } from './Icons'

interface Props {
  reason: string | null
  onActivate: (key: string) => Promise<void>
  onClose: () => void
}

const FEATURES = [
  'Unlimited photos per batch',
  'Shopify, eBay, Etsy & Amazon sizes',
  'Any background color',
  'Download everything as one ZIP',
  'Still 100% in your browser — nothing uploaded',
]

export function UnlockDialog({ reason, onActivate, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onActivate(key)
      dialog.current?.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/70 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
      aria-labelledby="unlock-title"
    >
      <div className="relative p-6">
        <button type="button" onClick={() => dialog.current?.close()} className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close">
          <XIcon width={18} height={18} />
        </button>
        <p className="text-xs font-semibold tracking-wide text-accent-600 uppercase">DropBG Pro</p>
        <h2 id="unlock-title" className="mt-1 text-2xl font-bold">
          {PRICE} once. Yours forever.
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {reason ?? `The free version handles ${FREE_BATCH_LIMIT} photos at a time.`} No subscription, no credits.
        </p>
        <ul className="mt-4 space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckIcon className="mt-0.5 shrink-0 text-emerald-600" /> {f}
            </li>
          ))}
        </ul>
        {CHECKOUT_URL ? (
          <a href={CHECKOUT_URL} target="_blank" rel="noopener" className="btn-primary mt-5 w-full py-2.5">
            Buy lifetime license — {PRICE}
          </a>
        ) : (
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Checkout isn’t configured yet (set <code>VITE_LS_CHECKOUT_URL</code>).
          </p>
        )}

        <form onSubmit={submit} className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <label htmlFor="license-key" className="text-sm font-medium">
            Already bought? Paste your license key
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="license-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              autoComplete="off"
              spellCheck={false}
              className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button type="submit" disabled={busy || !key.trim()} className="btn-secondary h-10">
              {busy ? <Spinner /> : 'Activate'}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">The key is in your purchase email. It’s checked with Lemon Squeezy and saved in this browser.</p>
        </form>
      </div>
    </dialog>
  )
}
