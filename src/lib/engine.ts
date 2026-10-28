import type { Box } from './geometry'
import type { Cutout } from './render'

export interface WorkerRequest {
  id: string
  file: Blob
  /** Skip WebGPU (debug: append ?device=cpu to the page URL). */
  forceCpu: boolean
}

export type WorkerResponse =
  | { type: 'download'; key: string; current: number; total: number }
  | ({ type: 'done'; id: string } & Cutout & { bbox: Box | null })
  | { type: 'error'; id: string; message: string }

export interface DownloadProgress {
  loaded: number
  total: number
}

type Pending = { resolve: (c: Cutout) => void; reject: (e: Error) => void }

/** Main-thread handle to the background-removal worker. */
class Engine {
  private worker: Worker | null = null
  private pending = new Map<string, Pending>()
  private downloads = new Map<string, { current: number; total: number }>()
  private listeners = new Set<(p: DownloadProgress) => void>()

  private get w() {
    if (!this.worker) {
      this.worker = new Worker(new URL('./bg.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.handle(e.data)
      this.worker.onerror = (e) => {
        const err = new Error(e.message || 'Background removal worker crashed')
        for (const p of this.pending.values()) p.reject(err)
        this.pending.clear()
        this.worker?.terminate()
        this.worker = null
      }
    }
    return this.worker
  }

  process(id: string, file: Blob): Promise<Cutout> {
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      const forceCpu = new URLSearchParams(location.search).get('device') === 'cpu'
      this.w.postMessage({ id, file, forceCpu } satisfies WorkerRequest)
    })
  }

  onDownload(fn: (p: DownloadProgress) => void) {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }

  private handle(msg: WorkerResponse) {
    if (msg.type === 'download') {
      this.downloads.set(msg.key, { current: msg.current, total: msg.total })
      let loaded = 0
      let total = 0
      for (const d of this.downloads.values()) {
        loaded += d.current
        total += d.total
      }
      for (const fn of this.listeners) fn({ loaded, total })
      return
    }
    const p = this.pending.get(msg.id)
    if (!p) {
      if (msg.type === 'done') msg.preview.close()
      return
    }
    this.pending.delete(msg.id)
    if (msg.type === 'error') p.reject(new Error(msg.message))
    else {
      const { blob, width, height, bbox, preview, device } = msg
      p.resolve({ blob, width, height, bbox, preview, device })
    }
  }
}

export const engine = new Engine()
