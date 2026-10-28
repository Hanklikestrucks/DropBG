// Runs the whole background-removal pipeline off the main thread. On the WASM
// path @imgly/background-removal does decoding, preprocessing and inference on
// whatever thread calls it, so calling it from the page would freeze the UI.
import { removeBackground, type Config } from '@imgly/background-removal'
import { alphaBounds, snapAlpha } from './geometry'
import type { WorkerRequest, WorkerResponse } from './engine'

type Device = 'gpu' | 'cpu'

const PREVIEW_MAX_SIDE = 768
const publicPath = new URL(`${import.meta.env.BASE_URL}bg-assets/`, self.location.origin).href

const post = (msg: WorkerResponse, transfer: Transferable[] = []) => self.postMessage(msg, { transfer })

// The library memoizes its ONNX session per JSON.stringify(config), so these
// objects must stay stable between calls (functions are ignored by stringify).
const makeConfig = (device: Device): Config => ({
  publicPath,
  device,
  model: 'isnet_fp16',
  output: { format: 'image/png' },
  progress: (key, current, total) => {
    if (key.startsWith('fetch:')) post({ type: 'download', key, current, total })
  },
})
const configs: Record<Device, Config> = { gpu: makeConfig('gpu'), cpu: makeConfig('cpu') }

let device: Device = 'gpu' in navigator ? 'gpu' : 'cpu'

async function segment(file: Blob, on: Device) {
  const bitmap = await createImageBitmap(await removeBackground(file, configs[on]))
  const { width, height } = bitmap
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('OffscreenCanvas 2D is not available')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixels = ctx.getImageData(0, 0, width, height)
  snapAlpha(pixels.data)
  const bbox = alphaBounds(pixels.data, width, height)
  ctx.putImageData(pixels, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })

  const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(width, height))
  const pw = Math.max(1, Math.round(width * scale))
  const ph = Math.max(1, Math.round(height * scale))
  const small = new OffscreenCanvas(pw, ph)
  const sctx = small.getContext('2d')!
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(canvas, 0, 0, pw, ph)
  return { blob, width, height, bbox, preview: small.transferToImageBitmap() }
}

async function process(file: Blob) {
  if (device === 'gpu') {
    try {
      const result = await segment(file, 'gpu')
      // A fully transparent mask from WebGPU is far more likely a backend
      // problem than a photo with no subject, so double-check on CPU.
      if (result.bbox) return { ...result, device }
      result.preview.close()
    } catch (err) {
      console.warn('WebGPU inference failed, falling back to WASM:', err)
    }
    device = 'cpu'
  }
  return { ...(await segment(file, 'cpu')), device }
}

// One image at a time; the UI queues sequentially but guard anyway.
let chain: Promise<unknown> = Promise.resolve()

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, file, forceCpu } = e.data
  if (forceCpu) device = 'cpu'
  chain = chain.then(async () => {
    try {
      const r = await process(file)
      post({ type: 'done', id, ...r }, [r.preview])
    } catch (err) {
      post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
    }
  })
}
