import { useEffect, useRef } from 'react'
import type { Preset } from '../lib/presets'
import { drawComposite, type Cutout } from '../lib/render'

interface Props {
  cutout: Pick<Cutout, 'width' | 'height' | 'bbox'>
  source: CanvasImageSource
  preset: Preset
  maxSide: number
  className?: string
}

/** Live preview of the final output, drawn with the same code path as the export. */
export function ResultCanvas({ cutout, source, preset, maxSide, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawComposite(ref.current, source, cutout, preset, maxSide)
  }, [cutout, source, preset, maxSide])
  return <canvas ref={ref} className={className} />
}
