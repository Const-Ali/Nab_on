/**
 * ماژول همگام‌سازی و اتصال به سرور و هاست (Nab Server Sync Client)
 * این ماژول ارتباط فرانت‌اند را با بک‌اند PHP یا Node.js برقرار می‌کند.
 */

import { save } from './shared'

const API_BASE = '/api.php' // آدرس پیش‌فرض فایل بک‌اند PHP روی هاست

export interface SyncStatus {
  online: boolean
  lastSynced: string | null
  serverType?: string
}

let isServerAvailable: boolean | null = null

/**
 * بررسی دسترسی به بک‌اند روی هاست
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}?action=ping`, { method: 'GET', cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      isServerAvailable = data.success === true
      return true
    }
  } catch {
    // try fallback for Node.js endpoint /api/ping
    try {
      const resNode = await fetch('/api/ping', { method: 'GET', cache: 'no-store' })
      if (resNode.ok) {
        const dataNode = await resNode.json()
        isServerAvailable = dataNode.success === true
        return true
      }
    } catch {
      isServerAvailable = false
    }
  }
  isServerAvailable = false
  return false
}

/**
 * بارگذاری کلیه داده‌ها از روی دیتابیس هاست
 */
export async function fetchAllFromServer(): Promise<Record<string, unknown> | null> {
  try {
    const isHealthy = isServerAvailable ?? (await checkServerHealth())
    if (!isHealthy) return null

    // Try PHP endpoint
    let res = await fetch(`${API_BASE}?action=get_all`, { method: 'GET', cache: 'no-store' })
    if (!res.ok) {
      // Try Node.js endpoint
      res = await fetch('/api/get_all', { method: 'GET', cache: 'no-store' })
    }
    if (res.ok) {
      const result = await res.json()
      if (result.success && result.data) {
        return result.data as Record<string, unknown>
      }
    }
  } catch (err) {
    console.warn('Could not fetch initial data from host server:', err)
  }
  return null
}

/**
 * ذخیره همزمان در حافظه محلی و ارسال به هاست
 */
export async function syncSave(key: string, value: unknown) {
  // ۱. ذخیره فوری در حافظه محلی (برای پاسخ‌دهی بلادرنگ UI)
  save(key, value)

  // ۲. ارسال ناهمگام به سرور هاست در پس‌زمینه
  try {
    const endpoint = isServerAvailable ? `${API_BASE}?action=save` : `${API_BASE}?action=save`
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }).catch(() => {
      // Node.js fallback
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      }).catch(() => {
        /* offline fallback */
      })
    })
  } catch {
    /* ignore offline fetch */
  }
}

/**
 * ارسال دسته‌ای چندین داده به هاست (Batch Sync)
 */
export async function syncBatchSave(items: Record<string, unknown>) {
  Object.entries(items).forEach(([k, v]) => save(k, v))

  try {
    fetch(`${API_BASE}?action=batch_save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }).catch(() => {
      fetch('/api/batch_save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {})
    })
  } catch {
    /* offline */
  }
}

/**
 * همگام‌سازی اولیه دیتابیس محلی با دیتابیس سرور
 */
export async function initialHydrateFromServer(): Promise<boolean> {
  const serverData = await fetchAllFromServer()
  if (!serverData) return false

  let count = 0
  for (const [k, v] of Object.entries(serverData)) {
    if (v !== null && v !== undefined) {
      save(k, v)
      count++
    }
  }
  return count > 0
}
