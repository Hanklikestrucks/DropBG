import { useState } from 'react'
import {
  CROPS,
  normalizeHex,
  SIZES,
  type BackgroundMode,
  type CropMode,
  type Preset,
  type SizeKey,
} from '../lib/presets'
import { LockIcon } from './Icons'

interface Props {
  preset: Preset
  pro: boolean
  onChange: (p: Preset) => void
  onLocked: (reason: string) => void
}

interface Option<T> {
  value: T
  label: string
  title?: string
  locked?: boolean
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onSelect,
  columns,
}: {
  label: string
  options: Option<T>[]
  value: T
  onSelect: (o: Option<T>) => void
  columns: number
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              title={o.title}
              aria-pressed={active}
              onClick={() => onSelect(o)}
              className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-accent-600 bg-accent-600 text-white shadow-sm'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {o.locked && <LockIcon width={12} height={12} className="shrink-0 opacity-60" />}
              <span className="truncate">{o.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function PresetsPanel({ preset, pro, onChange, onLocked }: Props) {
  const set = (patch: Partial<Preset>) => onChange({ ...preset, ...patch })
  // Free-typed hex while the field is focused; null means "show the preset's value".
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const backgrounds: Option<BackgroundMode>[] = [
    { value: 'transparent', label: 'Transparent' },
    { value: 'white', label: 'White' },
    { value: 'custom', label: 'Color', locked: !pro },
  ]
  const crops = (Object.keys(CROPS) as CropMode[]).map((value) => ({ value, label: CROPS[value].label, title: CROPS[value].hint }))
  const sizes = (Object.keys(SIZES) as SizeKey[]).map((value) => {
    const { label, px } = SIZES[value]
    return { value, label: px ? `${label} · ${px}` : label, title: px ? `${px}×${px}px` : 'Keep source resolution', locked: !pro && px !== null }
  })

  return (
    <section className="space-y-5" aria-label="Output presets">
      <Segmented
        label="Background"
        options={backgrounds}
        value={preset.background}
        columns={3}
        onSelect={(o) => (o.locked ? onLocked('Custom background colors are a Pro feature.') : set({ background: o.value }))}
      />
      {preset.background === 'custom' && (
        <div className="-mt-2 flex items-center gap-2">
          <input
            type="color"
            value={normalizeHex(preset.customHex) ?? '#ffffff'}
            onChange={(e) => set({ customHex: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Pick background color"
          />
          <input
            type="text"
            value={hexDraft ?? preset.customHex}
            onBlur={() => setHexDraft(null)}
            onChange={(e) => {
              setHexDraft(e.target.value)
              const hex = normalizeHex(e.target.value)
              if (hex) set({ customHex: hex })
            }}
            spellCheck={false}
            className="h-9 w-28 rounded-md border border-zinc-200 bg-white px-2 font-mono text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Background hex color"
          />
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Crop</legend>
        <div className="space-y-1.5">
          {crops.map((o) => {
            const active = o.value === preset.crop
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => set({ crop: o.value })}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? 'border-accent-600 bg-accent-50 dark:bg-accent-600/15'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                }`}
              >
                <span
                  className={`size-4 shrink-0 rounded-full border-2 ${active ? 'border-accent-600 bg-accent-600 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_var(--color-zinc-900)]' : 'border-zinc-300 dark:border-zinc-600'}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span className="block text-xs text-zinc-500">{o.title}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>
      {preset.crop === 'pad' && (
        <label className="-mt-2 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="w-16 shrink-0">Margin</span>
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={preset.padding}
            onChange={(e) => set({ padding: Number(e.target.value) })}
            className="flex-1 accent-accent-600"
          />
          <span className="w-10 text-right tabular-nums">{Math.round(preset.padding * 100)}%</span>
        </label>
      )}

      <Segmented
        label="Size"
        options={sizes}
        value={preset.size}
        columns={2}
        onSelect={(o) => (o.locked ? onLocked('Marketplace sizes are a Pro feature.') : set({ size: o.value }))}
      />
    </section>
  )
}
