// Lemon Squeezy License API. These endpoints need no API key and send
// `Access-Control-Allow-Origin: *`, so the browser can call them directly.
// Gating is client-side and therefore soft — fine for a one-time $19 tool.
const API = 'https://api.lemonsqueezy.com/v1/licenses'
const STORAGE_KEY = 'dropbg.license'
const PRODUCT_ID = import.meta.env.VITE_LS_PRODUCT_ID as string | undefined

export const CHECKOUT_URL = (import.meta.env.VITE_LS_CHECKOUT_URL as string | undefined) || ''

export interface License {
  key: string
  instanceId: string | null
  activatedAt: number
}

interface LsResponse {
  activated?: boolean
  valid?: boolean
  deactivated?: boolean
  error: string | null
  license_key?: { status: string }
  instance?: { id: string } | null
  meta?: { product_id: number; product_name: string }
}

async function call(endpoint: string, params: Record<string, string>): Promise<LsResponse> {
  const res = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams(params),
  })
  // 4xx responses still carry a JSON body with `error`.
  const data = (await res.json().catch(() => null)) as LsResponse | null
  if (!data) throw new Error(`License server returned HTTP ${res.status}`)
  return data
}

function wrongProduct(data: LsResponse) {
  return Boolean(PRODUCT_ID && data.meta && String(data.meta.product_id) !== PRODUCT_ID)
}

export function loadLicense(): License | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as License) : null
  } catch {
    return null
  }
}

function saveLicense(license: License | null) {
  try {
    if (license) localStorage.setItem(STORAGE_KEY, JSON.stringify(license))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private mode etc.): the unlock lasts for this tab only.
  }
}

export async function activateLicense(rawKey: string): Promise<License> {
  const key = rawKey.trim()
  if (!key) throw new Error('Enter your license key.')
  if (import.meta.env.DEV && key === 'DEV-UNLOCK') {
    const license = { key, instanceId: null, activatedAt: Date.now() }
    saveLicense(license)
    return license
  }
  const data = await call('activate', { license_key: key, instance_name: `DropBG web · ${navigator.platform || 'browser'}` })
  if (!data.activated) throw new Error(friendlyError(data.error))
  if (wrongProduct(data)) {
    // Don't burn an activation slot on another product's key.
    if (data.instance) await call('deactivate', { license_key: key, instance_id: data.instance.id }).catch(() => {})
    throw new Error('That license key is for a different product.')
  }
  const license = { key, instanceId: data.instance?.id ?? null, activatedAt: Date.now() }
  saveLicense(license)
  return license
}

/**
 * Re-check a stored license (e.g. refunded → disabled). Returns false only when
 * the server says the key is no longer good; network failures keep the unlock.
 */
export async function revalidateLicense(license: License): Promise<boolean> {
  if (import.meta.env.DEV && license.key === 'DEV-UNLOCK') return true
  try {
    const params: Record<string, string> = { license_key: license.key }
    if (license.instanceId) params.instance_id = license.instanceId
    const data = await call('validate', params)
    const ok = Boolean(data.valid) && !wrongProduct(data)
    if (!ok) saveLicense(null)
    return ok
  } catch {
    return true
  }
}

/** Frees this browser's activation slot so the key can be used elsewhere. */
export async function removeLicense(license: License) {
  saveLicense(null)
  if (license.instanceId) {
    await call('deactivate', { license_key: license.key, instance_id: license.instanceId }).catch(() => {})
  }
}

function friendlyError(error: string | null): string {
  if (!error) return 'That license key could not be activated.'
  if (/not found/i.test(error)) return "We couldn't find that license key. Check for typos — it's in your purchase email."
  if (/activation limit/i.test(error)) return 'This key has reached its activation limit. Remove it from another browser first.'
  return error
}
