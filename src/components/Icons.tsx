import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
)
export const FolderIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
)
export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" /></svg>
)
export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
)
export const XIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>
)
export const RetryIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
)
export const ChevronIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
)
export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
)
export const BoltIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
)
export const Spinner = ({ className = '', ...p }: IconProps) => (
  <svg {...base(p)} className={`animate-spin ${className}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
)
