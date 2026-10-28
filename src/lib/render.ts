import { computeLayout, type Box } from './geometry'
import { backgroundFill, type Preset } from './presets'

export interface Cutout {
  /** Full-resolution PNG with the background removed (alpha channel). */
  blob: Blob
  width: number
  height: number
  /** Subject bounds in full-resolution pixels; null if the model found nothing. */
  bbox: Box | null
  /** Downscaled copy of the cutout used for on-screen previews. */
  preview: ImageBitmap
  device: 'gpu' | 'cpu'
}

/**
 * Draw `source` (the full cutout or a downscaled copy of it) onto `canvas` using
 * the preset. Geometry is computed in full-resolution coordinates, so previews and
 * exports frame the product identically.
 */
export function drawComposite(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  cutout: Pick<Cutout, 'width' | 'height' | 'bbox'>,
  preset: Preset,
  maxSide?: number,
) {
  const layout = computeLayout(cutout.width, cutout.height, cutout.bbox, preset, maxSide)
  canvas.width = layout.outW
  canvas.height = layout.outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  const fill = backgroundFill(preset)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, layout.outW, layout.outH)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const { frame, scale } = layout
  ctx.drawImage(source, -frame.x * scale, -frame.y * scale, cutout.width * scale, cutout.height * scale)
  return layout
}

/** Full-resolution export of one cutout as a PNG blob. */
export async function renderPng(cutout: Cutout, preset: Preset): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout.blob)
  try {
    const canvas = document.createElement('canvas')
    drawComposite(canvas, bitmap, cutout, preset)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    canvas.width = canvas.height = 0
    if (!png) throw new Error('PNG encoding failed (image may be too large for this browser)')
    return png
  } finally {
    bitmap.close()
  }
}
