import { useCallback, useEffect, useState } from 'react'

export const APP_VERSION = __APP_VERSION__
export const GITHUB_REPOSITORY = 'Const-Ali/Nab_on'
export const GITHUB_REPOSITORY_URL = `https://github.com/${GITHUB_REPOSITORY}`
const RELEASES_URL = `${GITHUB_REPOSITORY_URL}/releases`
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`
const CACHE_KEY = `nab:github-latest-release:${GITHUB_REPOSITORY}`
const CACHE_TTL_MS = 15 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8 * 1000

interface CachedRelease {
  version: string
  url: string
  checkedAt: number
}

interface VersionSnapshot {
  latestVersion: string | null
  releaseUrl: string
  checkedAt: number | null
  checking: boolean
  error: boolean
}

export interface AppVersionStatus extends VersionSnapshot {
  currentVersion: string
  mismatch: boolean
  refresh: () => Promise<void>
}

function safeReleaseUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : RELEASES_URL
  } catch {
    return RELEASES_URL
  }
}

function readCachedRelease(): CachedRelease | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<CachedRelease>
    if (typeof value.version !== 'string' || typeof value.url !== 'string' || typeof value.checkedAt !== 'number') return null
    return { version: value.version, url: safeReleaseUrl(value.url), checkedAt: value.checkedAt }
  } catch {
    return null
  }
}

function writeCachedRelease(value: CachedRelease) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Version visibility must still work when storage is disabled or full.
  }
}

function normalizedVersion(value: string): string {
  const version = value.trim().replace(/^v/i, '').split(/[+-]/, 1)[0]
  const parts = version.split('.')
  if (!parts.length || parts.some(part => !/^\d+$/.test(part))) return version.toLowerCase()
  const numbers = parts.map(part => String(Number(part)))
  while (numbers.length > 1 && numbers.at(-1) === '0') numbers.pop()
  return numbers.join('.')
}

function snapshotFromCache(cached: CachedRelease, checking: boolean): VersionSnapshot {
  return {
    latestVersion: cached.version,
    releaseUrl: cached.url,
    checkedAt: cached.checkedAt,
    checking,
    error: false,
  }
}

export function useAppVersion(): AppVersionStatus {
  const [snapshot, setSnapshot] = useState<VersionSnapshot>(() => {
    const cached = readCachedRelease()
    if (!cached) return { latestVersion: null, releaseUrl: RELEASES_URL, checkedAt: null, checking: true, error: false }
    return snapshotFromCache(cached, Date.now() - cached.checkedAt >= CACHE_TTL_MS)
  })

  const checkLatestRelease = useCallback(async (force = false) => {
    const cached = readCachedRelease()
    if (!force && cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
      setSnapshot(snapshotFromCache(cached, false))
      return
    }

    if (force) setSnapshot(current => ({ ...current, checking: true, error: false }))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(LATEST_RELEASE_API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`GitHub release check failed (${response.status})`)
      const data = await response.json() as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown }
      if (typeof data.tag_name !== 'string' || !data.tag_name.trim() || data.draft === true || data.prerelease === true) {
        throw new Error('GitHub returned an invalid latest release.')
      }
      const releaseUrl = safeReleaseUrl(typeof data.html_url === 'string' ? data.html_url : '')
      const next: CachedRelease = { version: data.tag_name.trim(), url: releaseUrl, checkedAt: Date.now() }
      writeCachedRelease(next)
      setSnapshot(snapshotFromCache(next, false))
    } catch {
      setSnapshot(current => ({ ...current, checking: false, error: true }))
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkLatestRelease() }, 0)
    return () => window.clearTimeout(timer)
  }, [checkLatestRelease])

  const refresh = useCallback(() => checkLatestRelease(true), [checkLatestRelease])
  const mismatch = snapshot.latestVersion !== null && normalizedVersion(snapshot.latestVersion) !== normalizedVersion(APP_VERSION)

  return { ...snapshot, currentVersion: APP_VERSION, mismatch, refresh }
}
