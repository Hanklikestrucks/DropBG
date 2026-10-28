import { SIZES, type Preset } from './presets'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  /** Region of the source image (in source pixels) that maps onto the output; may extend past the edges. */
  frame: Box
  /** Output pixels per source pixel. */
  scale: number
  outW: number
  outH: number
}

/** Browsers (notably iOS Safari) refuse canvases above ~16.7 MP. */
export const MAX_CANVAS_PIXELS = 16_777_216

/**
 * The matting model never outputs fully opaque pixels (solid subjects come out at
 * alpha 250–254) and leaves faint haze in the background. Snap both ends so solid
 * areas are truly opaque and the background truly clear. Mutates `rgba`.
 */
export function snapAlpha(rgba: Uint8ClampedArray, lo = 4, hi = 250) {
  for (let i = 3; i < rgba.length; i += 4) {
    const a = rgba[i]
    if (a >= hi) rgba[i] = 255
    else if (a <= lo) rgba[i] = 0
  }
}

/**
 * Bounding box of pixels whose alpha is at or above `threshold`, from RGBA data.
 * Rows/columns with fewer than `minCount` such pixels are ignored so stray specks
 * left by the matting model don't inflate the crop. Returns null if nothing qualifies.
 */
export function alphaBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 32,
  minCount = 2,
): Box | null {
  const rows = new Uint32Array(height)
  const cols = new Uint32Array(width)
  for (let y = 0; y < height; y++) {
    let i = y * width * 4 + 3
    for (let x = 0; x < width; x++, i += 4) {
      if (rgba[i] >= threshold) {
        rows[y]++
        cols[x]++
      }
    }
  }
  const first = (a: Uint32Array) => a.findIndex((n) => n >= minCount)
  const last = (a: Uint32Array) => a.findLastIndex((n) => n >= minCount)
  const y0 = first(rows)
  const x0 = first(cols)
  if (y0 < 0 || x0 < 0) return null
  const y1 = last(rows)
  const x1 = last(cols)
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Where the cutout lands on the output canvas for a preset. `maxSide` caps the
 * output for previews; exports leave it unset.
 */
export function computeLayout(
  srcW: number,
  srcH: number,
  bbox: Box | null,
  preset: Pick<Preset, 'crop' | 'padding' | 'size'>,
  maxSide?: number,
): Layout {
  const subject = bbox ?? { x: 0, y: 0, w: srcW, h: srcH }
  const cx = subject.x + subject.w / 2
  const cy = subject.y + subject.h / 2

  let frame: Box
  if (preset.crop === 'square') {
    const s = Math.min(srcW, srcH)
    frame = {
      x: clamp(cx - s / 2, 0, srcW - s),
      y: clamp(cy - s / 2, 0, srcH - s),
      w: s,
      h: s,
    }
  } else if (preset.crop === 'pad') {
    const padding = clamp(preset.padding, 0, 0.45)
    const s = Math.max(subject.w, subject.h) / (1 - 2 * padding)
    frame = { x: cx - s / 2, y: cy - s / 2, w: s, h: s }
  } else {
    frame = { x: 0, y: 0, w: srcW, h: srcH }
  }

  const longest = Math.max(frame.w, frame.h)
  const target = SIZES[preset.size].px
  let scale = target ? target / longest : 1
  if (maxSide) scale = Math.min(scale, maxSide / longest)
  const area = frame.w * frame.h * scale * scale
  const capped = area > MAX_CANVAS_PIXELS
  if (capped) scale *= Math.sqrt(MAX_CANVAS_PIXELS / area)
  const toPx = capped ? Math.floor : Math.round

  return {
    frame,
    scale,
    outW: Math.max(1, toPx(frame.w * scale)),
    outH: Math.max(1, toPx(frame.h * scale)),
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi)
}
