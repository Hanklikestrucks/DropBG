import { describe, expect, it } from 'vitest'
import { uniqueNames } from './export'
import { alphaBounds, computeLayout, MAX_CANVAS_PIXELS, snapAlpha } from './geometry'
import { DEFAULT_PRESET, isPresetAllowed, normalizeHex, toFreePreset, type Preset } from './presets'

const preset = (p: Partial<Preset>): Preset => ({ ...DEFAULT_PRESET, ...p })

function rgbaWithBlock(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[(y * w + x) * 4 + 3] = 255
  return data
}

describe('alphaBounds', () => {
  it('finds the opaque block', () => {
    expect(alphaBounds(rgbaWithBlock(100, 80, 10, 20, 39, 59), 100, 80)).toEqual({ x: 10, y: 20, w: 30, h: 40 })
  })
  it('returns null for a fully transparent image', () => {
    expect(alphaBounds(new Uint8ClampedArray(10 * 10 * 4), 10, 10)).toBeNull()
  })
  it('ignores a lone speck far from the subject', () => {
    const data = rgbaWithBlock(100, 100, 40, 40, 59, 59)
    data[(2 * 100 + 97) * 4 + 3] = 255
    expect(alphaBounds(data, 100, 100)).toEqual({ x: 40, y: 40, w: 20, h: 20 })
  })
})

describe('snapAlpha', () => {
  it('makes near-opaque solid and near-clear transparent, keeps soft edges', () => {
    const px = new Uint8ClampedArray([9, 9, 9, 254, 9, 9, 9, 250, 9, 9, 9, 128, 9, 9, 9, 4, 9, 9, 9, 5])
    snapAlpha(px)
    expect([px[3], px[7], px[11], px[15], px[19]]).toEqual([255, 255, 128, 0, 5])
    expect(px[0]).toBe(9)
  })
})

describe('computeLayout', () => {
  const bbox = { x: 1000, y: 500, w: 800, h: 1200 }

  it('pad-to-square centers the subject with the requested margin', () => {
    const l = computeLayout(4000, 3000, bbox, preset({ crop: 'pad', padding: 0.1, size: 'original' }))
    expect(l.outW).toBe(l.outH)
    expect(l.frame.w).toBeCloseTo(1200 / 0.8)
    // subject's long side spans 80% of the output
    expect((bbox.h * l.scale) / l.outH).toBeCloseTo(0.8)
    expect(l.frame.x + l.frame.w / 2).toBeCloseTo(1400)
  })

  it('marketplace sizes produce exact square dimensions', () => {
    for (const [size, px] of [['shopify', 2048], ['ebay', 1600], ['etsy', 2000], ['amazon', 2000]] as const) {
      const l = computeLayout(3024, 4032, bbox, preset({ crop: 'pad', size }))
      expect([l.outW, l.outH]).toEqual([px, px])
    }
  })

  it('square crop stays inside the image and follows the subject', () => {
    const l = computeLayout(4000, 3000, { x: 3500, y: 100, w: 400, h: 400 }, preset({ crop: 'square' }))
    expect(l.frame).toEqual({ x: 1000, y: 0, w: 3000, h: 3000 })
  })

  it('crop none keeps the aspect ratio when resizing', () => {
    const l = computeLayout(4000, 3000, bbox, preset({ crop: 'none', size: 'ebay' }))
    expect([l.outW, l.outH]).toEqual([1600, 1200])
  })

  it('falls back to the full image when no subject was found', () => {
    const l = computeLayout(400, 300, null, preset({ crop: 'pad', padding: 0 }))
    expect(l.frame).toEqual({ x: 0, y: -50, w: 400, h: 400 })
  })

  it('caps previews and huge canvases', () => {
    expect(computeLayout(4000, 3000, bbox, preset({ crop: 'none' }), 400).outW).toBe(400)
    const huge = computeLayout(8000, 6000, null, preset({ crop: 'none' }))
    expect(huge.outW * huge.outH).toBeLessThanOrEqual(MAX_CANVAS_PIXELS)
  })
})

describe('presets & gating', () => {
  it('free tier allows transparent/white at original size only', () => {
    expect(isPresetAllowed(preset({ background: 'white', size: 'original', crop: 'pad' }), false)).toBe(true)
    expect(isPresetAllowed(preset({ background: 'transparent', size: 'original' }), false)).toBe(true)
    expect(isPresetAllowed(preset({ background: 'custom' }), false)).toBe(false)
    expect(isPresetAllowed(preset({ size: 'shopify' }), false)).toBe(false)
    expect(isPresetAllowed(preset({ background: 'custom', size: 'amazon' }), true)).toBe(true)
    expect(toFreePreset(preset({ background: 'custom', size: 'etsy' }))).toMatchObject({ background: 'white', size: 'original' })
  })
  it('normalizes hex colors', () => {
    expect(normalizeHex('FFF')).toBe('#ffffff')
    expect(normalizeHex('#12aBcD')).toBe('#12abcd')
    expect(normalizeHex('blue')).toBeNull()
  })
})

describe('uniqueNames', () => {
  it('converts to .png and de-duplicates', () => {
    expect(uniqueNames(['shoe.jpg', 'shoe.png', 'shoe-2.png', 'IMG_01.WEBP', 'a.b.jpeg'])).toEqual([
      'shoe.png',
      'shoe-2.png',
      'shoe-2-2.png',
      'IMG_01.png',
      'a.b.png',
    ])
  })
})
