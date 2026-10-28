import { useCallback, useEffect, useState } from 'react'
import { activateLicense, loadLicense, removeLicense, revalidateLicense, type License } from '../lib/license'

export function useLicense() {
  const [license, setLicense] = useState<License | null>(loadLicense)

  // Re-check once per load so refunded/disabled keys lose access.
  useEffect(() => {
    const stored = loadLicense()
    if (stored) void revalidateLicense(stored).then((ok) => !ok && setLicense(null))
  }, [])

  const activate = useCallback(async (key: string) => setLicense(await activateLicense(key)), [])
  const remove = useCallback(async () => {
    if (license) await removeLicense(license)
    setLicense(null)
  }, [license])

  return { pro: license !== null, license, activate, remove }
}
