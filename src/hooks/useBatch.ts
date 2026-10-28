import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { engine, type DownloadProgress } from '../lib/engine'
import { FREE_BATCH_LIMIT } from '../lib/presets'
import type { Cutout } from '../lib/render'

export type ItemStatus = 'queued' | 'processing' | 'done' | 'error' | 'locked'

export interface Item {
  id: string
  file: File
  /** Object URL of the original, for thumbnails and the "before" view. */
  url: string
  status: ItemStatus
  error?: string
  cutout?: Cutout
  ms?: number
}

type Action =
  | { type: 'add'; items: Item[] }
  | { type: 'update'; id: string; patch: Partial<Item> }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'unlock' }

function release(item: Item) {
  URL.revokeObjectURL(item.url)
  item.cutout?.preview.close()
}

function reducer(items: Item[], action: Action): Item[] {
  switch (action.type) {
    case 'add':
      return [...items, ...action.items]
    case 'update':
      return items.map((it) => (it.id === action.id ? { ...it, ...action.patch } : it))
    case 'remove':
      return items.filter((it) => it.id !== action.id)
    case 'clear':
      return []
    case 'unlock':
      return items.map((it) => (it.status === 'locked' ? { ...it, status: 'queued' } : it))
  }
}

let nextId = 0

export function useBatch(pro: boolean) {
  const [items, dispatch] = useReducer(reducer, [])
  const [download, setDownload] = useState<DownloadProgress | null>(null)
  const [tick, setTick] = useState(0)
  const running = useRef<string | null>(null)
  const itemsRef = useRef(items)
  useLayoutEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => engine.onDownload(setDownload), [])

  useEffect(() => {
    if (pro) dispatch({ type: 'unlock' })
  }, [pro])

  // Sequential queue: whenever nothing is running, start the next queued item.
  useEffect(() => {
    if (running.current) return
    const next = items.find((it) => it.status === 'queued')
    if (!next) return
    running.current = next.id
    dispatch({ type: 'update', id: next.id, patch: { status: 'processing', error: undefined } })
    const started = performance.now()
    engine
      .process(next.id, next.file)
      .then((cutout) => {
        if (itemsRef.current.some((it) => it.id === next.id)) {
          dispatch({ type: 'update', id: next.id, patch: { status: 'done', cutout, ms: performance.now() - started } })
        } else cutout.preview.close()
      })
      .catch((err: Error) => dispatch({ type: 'update', id: next.id, patch: { status: 'error', error: err.message } }))
      .finally(() => {
        running.current = null
        setTick((t) => t + 1) // re-run this effect even if the item was removed meanwhile
      })
  }, [items, tick])

  const addFiles = useCallback(
    (files: File[]) => {
      const current = itemsRef.current.filter((it) => it.status !== 'locked').length
      let freeSlots = pro ? Infinity : Math.max(0, FREE_BATCH_LIMIT - current)
      const added: Item[] = files.map((file) => ({
        id: `img-${++nextId}`,
        file,
        url: URL.createObjectURL(file),
        status: freeSlots-- > 0 ? 'queued' : 'locked',
      }))
      dispatch({ type: 'add', items: added })
    },
    [pro],
  )

  const remove = useCallback((id: string) => {
    const item = itemsRef.current.find((it) => it.id === id)
    if (item) release(item)
    dispatch({ type: 'remove', id })
  }, [])

  const clear = useCallback(() => {
    itemsRef.current.forEach(release)
    dispatch({ type: 'clear' })
  }, [])

  const retry = useCallback((id: string) => dispatch({ type: 'update', id, patch: { status: 'queued' } }), [])

  return { items, download, addFiles, remove, clear, retry }
}
