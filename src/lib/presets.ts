export type BackgroundMode = 'transparent' | 'white' | 'custom'
export type CropMode = 'none' | 'square' | 'pad'
export type SizeKey = 'original' | 'shopify' | 'ebay' | 'etsy' | 'amazon'

export interface Preset {
  background: BackgroundMode
  customHex: string
  crop: CropMode
  /** Margin around the subject for `pad`, as a fraction of the output side (0–0.25). */
  padding: number
  size: SizeKey
}

export const SIZES: Record<SizeKey, { label: string; px: number | null }> = {
  original: { label: 'Original', px: null },
  shopify: { label: 'Shopify', px: 2048 },
  ebay: { label: 'eBay', px: 1600 },
  etsy: { label: 'Etsy', px: 2000 },
  amazon: { label: 'Amazon', px: 2000 },
}

export const CROPS: Record<CropMode, { label: string; hint: string }> = {
  none: { label: 'None', hint: 'Keep the original framing' },
  square: { label: 'Square', hint: 'Square crop centered on the product' },
  pad: { label: 'Pad to square', hint: 'Trim to the product, then center it on a square' },
}

export const DEFAULT_PRESET: Preset = {
  background: 'white',
  customHex: '#f4f4f5',
  crop: 'pad',
  padding: 0.05,
  size: 'original',
}

export const FREE_BATCH_LIMIT = 3
export const PRICE = '$19'

/** Free tier: transparent/white backgrounds, no resizing. Crop modes are free. */
export function isPresetAllowed(preset: Preset, pro: boolean): boolean {
  return pro || (preset.background !== 'custom' && preset.size === 'original')
}

export function toFreePreset(preset: Preset): Preset {
  return {
    ...preset,
    background: preset.background === 'custom' ? 'white' : preset.background,
    size: 'original',
  }
}

export function backgroundFill(preset: Preset): string | null {
  if (preset.background === 'white') return '#ffffff'
  if (preset.background === 'custom') return normalizeHex(preset.customHex) ?? '#ffffff'
  return null
}

export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())
  if (!m) return null
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return `#${hex.toLowerCase()}`
}

export function describePreset(preset: Preset): string {
  const bg =
    preset.background === 'custom' ? (normalizeHex(preset.customHex) ?? 'custom') : preset.background
  const size = SIZES[preset.size]
  const sizeText = size.px ? `${size.px}px (${size.label})` : 'original size'
  return `${bg} · ${CROPS[preset.crop].label.toLowerCase()} · ${sizeText}`
}
