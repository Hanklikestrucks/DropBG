const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ACCEPTED_EXT = /\.(jpe?g|png|webp)$/i

export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

export function isSupported(file: File) {
  return ACCEPTED_TYPES.has(file.type) || (!file.type && ACCEPTED_EXT.test(file.name))
}

/** Split into supported images (sorted by name, natural order) and skipped files. */
export function partitionFiles(files: File[]) {
  const accepted: File[] = []
  const skipped: File[] = []
  for (const f of files) {
    if (f.name.startsWith('.')) continue // .DS_Store and friends
    ;(isSupported(f) ? accepted : skipped).push(f)
  }
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  accepted.sort((a, b) => collator.compare(a.name, b.name))
  return { accepted, skipped }
}

/**
 * Files from a drop, descending into dropped folders. Entries must be grabbed
 * synchronously inside the drop handler — the DataTransfer is emptied afterwards —
 * so call this directly from `onDrop` before any await.
 */
export function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = [...dt.items]
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => Boolean(e))
  if (!entries.length) return Promise.resolve([...dt.files])
  return Promise.all(entries.map(walk)).then((lists) => lists.flat())
}

async function walk(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([])))
  }
  if (!entry.isDirectory) return []
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  const children: FileSystemEntry[] = []
  // readEntries returns results in batches (100 in Chrome) until it returns [].
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
    if (!batch.length) break
    children.push(...batch)
  }
  return (await Promise.all(children.map(walk))).flat()
}
