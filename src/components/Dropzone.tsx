import { useRef } from 'react'
import { ACCEPT_ATTR, filesFromDrop } from '../lib/files'
import { FolderIcon, UploadIcon } from './Icons'

interface Props {
  compact: boolean
  onFiles: (files: File[]) => void
}

export function Dropzone({ compact, onFiles }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles([...(e.target.files ?? [])])
    e.target.value = ''
  }

  const inputs = (
    <>
      <input ref={fileInput} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={pick} data-testid="file-input" />
      <input
        ref={folderInput}
        type="file"
        className="hidden"
        onChange={pick}
        {...{ webkitdirectory: '', directory: '' }}
      />
    </>
  )

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {inputs}
        <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary">
          <UploadIcon /> Add photos
        </button>
        <button type="button" onClick={() => folderInput.current?.click()} className="btn-secondary">
          <FolderIcon /> Add folder
        </button>
        <span className="text-sm text-zinc-500">or drop more anywhere</span>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => fileInput.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void filesFromDrop(e.dataTransfer).then(onFiles)
      }}
      className="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 py-16 text-center transition hover:border-accent-500 hover:bg-accent-50/50 focus-visible:outline-2 focus-visible:outline-accent-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
    >
      {inputs}
      <div className="flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700 transition group-hover:scale-105 dark:bg-accent-600/20 dark:text-accent-100">
        <UploadIcon width={26} height={26} />
      </div>
      <div>
        <p className="text-lg font-semibold">Drop product photos or a whole folder</p>
        <p className="mt-1 text-sm text-zinc-500">JPG, PNG or WEBP · processed on your device, never uploaded</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => fileInput.current?.click()} className="btn-primary">
          Choose photos
        </button>
        <button type="button" onClick={() => folderInput.current?.click()} className="btn-secondary">
          <FolderIcon /> Choose folder
        </button>
      </div>
    </div>
  )
}
